import { useId, useRef, useState, type DragEvent } from 'react';
import { Button } from '../../../../components/ui/Button';
import { Icon } from '../../../../components/ui/Icon';
import { Modal } from '../../../../components/ui/Modal';
import { DEMO_SUPPLIER_ID } from '../../../../data/desk';
import type { VaultCert } from '../../../../data/supplierDesk';
import { supplierById } from '../../../../data/suppliers';
import { CERT_TYPES, type EvidenceSubmission } from '../../../../data/svsDesk';
import {
  ACCEPTED_EXTENSIONS,
  EMPTY_CERT_FORM,
  MAX_FILE_BYTES,
  exampleCertForm,
  fileSizeLabel,
  formatDateGB,
  shiftISO,
  todayISO,
  validateCertForm,
  type CertForm,
} from '../../../../lib/svsDesk';
import { useApp } from '../../../../store/app';
import { useSvsDesk } from '../../../../store/svsDesk';
import { ModalHeading, StillNeeded } from './form';
import { INPUT, LABEL, READONLY_INPUT } from './formStyles';

/**
 * Send a certificate to the SVS team (spec §3 Certificate modal). Three ways
 * in: a new certificate, a renewal of one already held (the type is locked
 * to it), or a re-upload after the team asked for more (locked likewise).
 *
 * The file is chosen with a real file input behind a visible "Browse files"
 * button, or dropped on the zone. Only its name and size are kept — nothing
 * leaves the browser, and the form says so.
 */

export type CertModalMode =
  | { kind: 'new'; presetType?: string }
  | { kind: 'renewal'; vault: VaultCert }
  | { kind: 'reupload'; submission: EvidenceSubmission };

const TITLE_ID = 'supplier-cert-title';

function titleFor(mode: CertModalMode): string {
  if (mode.kind === 'renewal') return `Upload a renewal: ${mode.vault.name}`;
  if (mode.kind === 'reupload') return `Re-upload: ${mode.submission.certLabel}`;
  return 'Add a certificate';
}

function initialForm(mode: CertModalMode): CertForm {
  if (mode.kind === 'renewal') return { ...EMPTY_CERT_FORM, certType: mode.vault.name };
  if (mode.kind === 'reupload') {
    const s = mode.submission;
    return {
      ...EMPTY_CERT_FORM,
      certType: s.certType,
      otherLabel: s.certType === 'Other' ? s.certLabel : '',
      issuer: s.issuer,
      reference: s.reference,
      issuedOn: s.issuedOn,
      expiresOn: s.expiresOn,
    };
  }
  return { ...EMPTY_CERT_FORM, certType: mode.presetType ?? '' };
}

/** 'CW-26-0418' → 'CW-26-0419': the next certificate number from the same issuer. */
function nextReference(ref: string): string {
  const m = /^(.*?)(\d+)$/.exec(ref);
  if (!m) return `${ref}-R`;
  const digits = m[2]!;
  return `${m[1]}${String(Number(digits) + 1).padStart(digits.length, '0')}`;
}

/**
 * Same issuer, the next reference, issued two days before `today` for the
 * certificate's usual term — dated from the day it is filled in, so the form
 * never refuses its own example as expired.
 */
function renewalExample(v: VaultCert, today: string): CertForm {
  const years = Math.max(1, Number(v.expiresOn.slice(0, 4)) - Number(v.issuedOn.slice(0, 4)));
  const reference = nextReference(v.reference);
  const issuedOn = shiftISO(today, { days: -2 });
  return {
    ...EMPTY_CERT_FORM,
    certType: v.name,
    issuer: v.issuer,
    reference,
    issuedOn,
    expiresOn: shiftISO(issuedOn, { years, days: -1 }),
    fileName: `${reference}.pdf`,
    fileSize: 312 * 1024,
    declared: true,
  };
}

/** "Fill with an example". Called from the button's handler, so `todayISO()` is read there. */
function exampleFor(mode: CertModalMode, current: CertForm): CertForm {
  if (mode.kind === 'renewal') return renewalExample(mode.vault, todayISO());
  if (mode.kind === 'reupload') {
    const base = initialForm(mode);
    return {
      ...base,
      fileName: `${mode.submission.reference}-clear-scan.pdf`,
      fileSize: 356 * 1024,
      declared: true,
      issuer: current.issuer || base.issuer,
      reference: current.reference || base.reference,
    };
  }
  return exampleCertForm(todayISO());
}

/** Told the moment a file is chosen — the send button would refuse it anyway. */
function fileProblem(name: string, size: number): string | null {
  if (!name) return null;
  const lower = name.toLowerCase();
  if (!ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    return 'This file is not a PDF, JPG or PNG. Choose another file.';
  }
  if (size > MAX_FILE_BYTES) return `This file is ${fileSizeLabel(size)}; the limit is 10 MB.`;
  return null;
}

export function CertificateModal({
  mode,
  onClose,
}: {
  mode: CertModalMode | null;
  onClose: () => void;
}) {
  const key =
    mode === null
      ? 'closed'
      : mode.kind === 'renewal'
        ? `renewal-${mode.vault.id}`
        : mode.kind === 'reupload'
          ? `reupload-${mode.submission.id}`
          : `new-${mode.presetType ?? ''}`;
  return (
    <Modal open={mode !== null} onClose={onClose} labelledBy={TITLE_ID} size="lg">
      {mode ? <CertificateForm key={key} mode={mode} onClose={onClose} /> : null}
    </Modal>
  );
}

function CertificateForm({ mode, onClose }: { mode: CertModalMode; onClose: () => void }) {
  const submitEvidence = useSvsDesk((s) => s.submitEvidence);
  const pushToast = useApp((s) => s.pushToast);
  const ids = useId();
  const fileInput = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<CertForm>(() => initialForm(mode));
  // Read once as the form mounts (never in render): the latest issue date the picker offers.
  const [today] = useState(todayISO);
  const [problems, setProblems] = useState<string[]>([]);
  const [tried, setTried] = useState(false);
  const [dragging, setDragging] = useState(false);

  const locked = mode.kind !== 'new';
  const lockedLabel =
    mode.kind === 'renewal'
      ? mode.vault.name
      : mode.kind === 'reupload'
        ? mode.submission.certLabel
        : '';
  const chosenProblem = fileProblem(form.fileName, form.fileSize);

  /** Replaces the form; once it has been tried, the "Still needed" line follows it. */
  function replace(next: CertForm) {
    setForm(next);
    if (tried) setProblems(validateCertForm(next, todayISO()));
  }

  function update(patch: Partial<CertForm>) {
    replace({ ...form, ...patch });
  }

  function takeFile(file: File | undefined) {
    if (!file) return;
    // Name and size only: the file itself is never read or stored.
    update({ fileName: file.name, fileSize: file.size });
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    takeFile(e.dataTransfer.files[0]);
  }

  function removeFile() {
    update({ fileName: '', fileSize: 0 });
    // The Remove button goes with the file; Browse files is where the next one comes from.
    document.getElementById(`${ids}-browse`)?.focus();
  }

  function send() {
    setTried(true);
    const found = validateCertForm(form, todayISO());
    setProblems(found);
    if (found.length > 0) return;
    const supplier = supplierById(DEMO_SUPPLIER_ID)!;
    submitEvidence({
      supplierId: supplier.id,
      supplierName: supplier.name,
      kind: mode.kind === 'renewal' ? 'renewal' : 'new',
      ...(mode.kind === 'renewal' ? { vaultId: mode.vault.id } : {}),
      form,
    });
    const label = form.certType === 'Other' ? form.otherLabel.trim() : form.certType;
    pushToast(`Sent to the SVS team: ${label}. It shows as awaiting review until they decide.`);
    onClose();
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <ModalHeading id={TITLE_ID} eyebrow="Certificates · to the SVS team" title={titleFor(mode)}>
        {mode.kind === 'renewal' ? (
          <p>
            In force now: {mode.vault.issuer} · {mode.vault.reference}, expires{' '}
            {formatDateGB(mode.vault.expiresOn)}. It stays in force while the SVS team reviews the
            renewal.
          </p>
        ) : mode.kind === 'reupload' ? (
          <p>
            {mode.submission.note ? (
              <>
                The SVS team asked: <q className="text-ink">{mode.submission.note}</q>
              </>
            ) : (
              'Send the certificate again with the corrected file.'
            )}
          </p>
        ) : (
          <p>The SVS team checks it with the issuer before it shows on your listing.</p>
        )}
      </ModalHeading>

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor={`${ids}-type`} className={LABEL}>
            Certificate type
          </label>
          {locked ? (
            <>
              <input
                id={`${ids}-type`}
                readOnly
                value={lockedLabel}
                aria-describedby={`${ids}-type-help`}
                className={READONLY_INPUT}
              />
              <p
                id={`${ids}-type-help`}
                className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-soft"
              >
                <Icon name="shield-check" size={13} className="shrink-0" />
                {mode.kind === 'renewal'
                  ? 'Locked to the certificate you are renewing.'
                  : 'Locked to the certificate you are sending again.'}
              </p>
            </>
          ) : (
            <select
              id={`${ids}-type`}
              value={form.certType}
              onChange={(e) => update({ certType: e.target.value })}
              className={INPUT}
            >
              <option value="">Choose a type…</option>
              {CERT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
        </div>

        {!locked && form.certType === 'Other' ? (
          <div>
            <label htmlFor={`${ids}-other`} className={LABEL}>
              Describe the certificate
            </label>
            <input
              id={`${ids}-other`}
              type="text"
              value={form.otherLabel}
              onChange={(e) => update({ otherLabel: e.target.value })}
              className={INPUT}
            />
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${ids}-issuer`} className={LABEL}>
              Issuing body
            </label>
            <input
              id={`${ids}-issuer`}
              type="text"
              value={form.issuer}
              onChange={(e) => update({ issuer: e.target.value })}
              className={INPUT}
            />
          </div>
          <div>
            <label htmlFor={`${ids}-ref`} className={LABEL}>
              Reference or certificate number
            </label>
            <input
              id={`${ids}-ref`}
              type="text"
              value={form.reference}
              onChange={(e) => update({ reference: e.target.value })}
              className={INPUT}
            />
          </div>
          <div>
            <label htmlFor={`${ids}-issued`} className={LABEL}>
              Issue date
            </label>
            <input
              id={`${ids}-issued`}
              type="date"
              max={today}
              value={form.issuedOn}
              onChange={(e) => update({ issuedOn: e.target.value })}
              className={`${INPUT} tabular-nums`}
            />
          </div>
          <div>
            <label htmlFor={`${ids}-expires`} className={LABEL}>
              Expiry date
            </label>
            <input
              id={`${ids}-expires`}
              type="date"
              value={form.expiresOn}
              onChange={(e) => update({ expiresOn: e.target.value })}
              className={`${INPUT} tabular-nums`}
            />
          </div>
        </div>

        <div>
          <label id={`${ids}-filelabel`} htmlFor={`${ids}-file`} className={LABEL}>
            Certificate file
          </label>
          <input
            ref={fileInput}
            id={`${ids}-file`}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            tabIndex={-1}
            className="hidden"
            onChange={(e) => {
              takeFile(e.target.files?.[0]);
              // Cleared so choosing the same file again still registers.
              e.target.value = '';
            }}
          />
          <div
            onDragEnter={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
              if (!dragging) setDragging(true);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
            }}
            onDrop={onDrop}
            className={`mt-1 rounded-lg border-[1.5px] border-dashed p-4 transition-colors ${
              dragging ? 'border-sea bg-sea-soft' : 'border-line-strong bg-paper'
            }`}
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
              <span
                aria-hidden="true"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-sea shadow-card"
              >
                <Icon name="upload" size={19} />
              </span>
              <div className="min-w-0 flex-1 basis-[180px]">
                <p id={`${ids}-drop`} className="text-[13px] leading-snug font-semibold text-ink">
                  {dragging
                    ? 'Drop the file to attach it'
                    : 'Drag a PDF, JPG or PNG here, or browse'}
                </p>
                <p className="mt-0.5 text-[12px] text-ink-soft">Up to 10 MB · one file</p>
              </div>
              <Button
                id={`${ids}-browse`}
                type="button"
                variant="ghost"
                aria-describedby={`${ids}-filelabel ${ids}-drop`}
                onClick={() => fileInput.current?.click()}
                className="shrink-0 max-sm:w-full"
              >
                <Icon name="file-plus" size={16} />
                Browse files
              </Button>
            </div>

            {form.fileName ? (
              <div className="mt-3 border-t border-line pt-3">
                <div
                  data-testid="chosen-file"
                  className={`flex items-center gap-2.5 rounded-lg border bg-white px-3 py-2 ${
                    chosenProblem ? 'border-danger' : 'border-line'
                  }`}
                >
                  <Icon
                    name={chosenProblem ? 'triangle-alert' : 'file-check'}
                    size={17}
                    className={`shrink-0 ${chosenProblem ? 'text-danger' : 'text-sea'}`}
                  />
                  {/* "{name} · {size}" on one line; on a phone the size drops under
                      the name, so a long name is shortened and the size never is. */}
                  <div className="min-w-0 flex-1 sm:flex sm:items-baseline">
                    <p
                      title={form.fileName}
                      className="min-w-0 truncate text-[13px] font-semibold text-ink"
                    >
                      {form.fileName}
                    </p>
                    <p className="text-[12px] whitespace-nowrap text-ink-soft sm:shrink-0 sm:text-[13px] sm:font-semibold sm:text-ink">
                      <span className="max-sm:sr-only">&nbsp;·&nbsp;</span>
                      {fileSizeLabel(form.fileSize)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="-my-1.5 min-h-[44px] shrink-0 cursor-pointer rounded-md px-2 text-[12.5px] font-bold text-sea hover:bg-sea-soft sm:-my-1 sm:min-h-[36px]"
                  >
                    Remove<span className="sr-only"> {form.fileName}</span>
                  </button>
                </div>
                {chosenProblem ? (
                  <p
                    data-testid="file-problem"
                    className="mt-1.5 text-[12px] font-semibold text-danger"
                  >
                    {chosenProblem}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          {/* Always mounted, so a screen reader hears the file go on and any
              refusal at once. Not an alert: the dialog's one alert is the
              "Still needed" line. */}
          <p className="sr-only" aria-live="polite">
            {form.fileName
              ? `Attached ${form.fileName}, ${fileSizeLabel(form.fileSize)}.${
                  chosenProblem ? ` ${chosenProblem}` : ''
                }`
              : ''}
          </p>
        </div>

        {/* 44px tall on a phone, where the label is the tap target. */}
        <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-ink max-sm:min-h-[44px]">
          <input
            type="checkbox"
            checked={form.declared}
            onChange={(e) => update({ declared: e.target.checked })}
            className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-sea"
          />
          <span>I confirm this is a true copy of the current certificate.</span>
        </label>

        <p className="flex items-start gap-2 rounded-lg bg-paper px-3 py-2.5 text-[12px] leading-snug text-ink-soft">
          <Icon name="shield-check" size={15} className="mt-px shrink-0 text-sea" />
          <span>
            Nothing leaves this browser — the upload is simulated. The SVS team typically reviews
            evidence within two working days (illustrative).
          </span>
        </p>
      </div>

      <StillNeeded problems={problems} />

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => replace(exampleFor(mode, form))}
          className="max-sm:w-full"
        >
          Fill with an example
        </Button>
        <div className="flex gap-3 max-sm:w-full sm:ml-auto">
          <Button type="button" variant="ghost" onClick={onClose} className="shrink-0">
            Cancel
          </Button>
          <Button type="submit" className="max-sm:flex-1">
            <Icon name="send" size={16} className="max-sm:hidden" />
            Send to the SVS team
          </Button>
        </div>
      </div>
    </form>
  );
}
