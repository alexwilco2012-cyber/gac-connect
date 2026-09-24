import { useCallback, useMemo, useRef, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Eyebrow } from '../../../components/ui/Eyebrow';
import { Icon } from '../../../components/ui/Icon';
import { Modal } from '../../../components/ui/Modal';
import { Pill } from '../../../components/ui/Pill';
import type { EvidenceSubmission } from '../../../data/svsDesk';
import { evidenceOpenCount, evidenceStatus, formatDateGB } from '../../../lib/svsDesk';
import { useApp } from '../../../store/app';
import { useSvsDesk } from '../../../store/svsDesk';
import { DocumentPreview } from './DocumentPreview';
import { AuditTrail, NoteForm } from './parts';
import { focusSoon, midSentence, refNumber } from './ui';

/**
 * The evidence queue (spec §4.5): certificates suppliers have sent in, open
 * items first and newest first, with the selected one on the right — a mock
 * of the document, the record as a definition list, the trail, and the three
 * decisions. A note (asking for more, or rejecting) is typed in a dialog.
 *
 * Approving a new certificate adds it to the supplier's record on the
 * register, their profile and their dashboard (`certsWithApproved`); an
 * approved renewal takes over the vault row's dates (`vaultRows`). Neither
 * changes a certificate the booking gate already reads, so no status moves.
 */

type NoteKind = 'info' | 'reject';

const isOpen = (e: EvidenceSubmission) => e.stage === 'submitted';

function sortQueue(evidence: readonly EvidenceSubmission[]): EvidenceSubmission[] {
  return [...evidence].sort(
    (a, b) => Number(isOpen(b)) - Number(isOpen(a)) || refNumber(b.id) - refNumber(a.id),
  );
}

/** "Submitted today 07:35", "Submitted yesterday 15:40". */
function submittedLine(at: string): string {
  return `Submitted ${midSentence(at)}`;
}

function QueueRow({
  item,
  selected,
  onSelect,
}: {
  item: EvidenceSubmission;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const status = evidenceStatus(item.stage);
  return (
    <li>
      <button
        type="button"
        aria-pressed={selected}
        onClick={() => onSelect(item.id)}
        className={`relative block w-full cursor-pointer rounded-lg border px-3.5 py-3 text-left transition-colors ${
          selected
            ? 'border-[#B7CCDD] bg-sea-soft/70 shadow-[inset_3px_0_0_#0E5E8A]'
            : 'border-transparent bg-transparent hover:bg-paper'
        }`}
      >
        <span className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <span className="min-w-0 text-[13.5px] leading-snug font-bold text-ink">
            {item.supplierName}
          </span>
          <Pill tone={status.tone}>{status.label}</Pill>
        </span>
        <span className="mt-1 block text-[13px] leading-snug text-ink">{item.certLabel}</span>
        <span className="mt-1 block text-[12px] text-ink-soft tabular-nums">
          {item.kind === 'renewal' ? 'Renewal' : 'New certificate'} ·{' '}
          {submittedLine(item.submittedAt)}
        </span>
      </button>
    </li>
  );
}

function NoteDialog({
  kind,
  item,
  onClose,
  onDone,
}: {
  kind: NoteKind | null;
  item: EvidenceSubmission;
  onClose: () => void;
  onDone: (kind: NoteKind, note: string) => void;
}) {
  return (
    <Modal open={kind !== null} onClose={onClose} labelledBy="evidence-note-title">
      {kind ? (
        <>
          <Eyebrow>
            {item.id} · {item.supplierName}
          </Eyebrow>
          <h2 id="evidence-note-title" className="mt-1 font-display text-[19px] font-bold">
            {kind === 'info' ? 'Request information' : 'Reject certificate'}
          </h2>
          <p className="mt-1 mb-4 text-[13px] text-ink-soft">
            {kind === 'info'
              ? `${item.certLabel} goes back to ${item.supplierName} with your note, and leaves the queue until they send it again.`
              : `${item.certLabel} is rejected. ${item.supplierName} sees your reason, and anything already on their record stands.`}
          </p>
          <NoteForm
            key={kind}
            label={kind === 'info' ? 'Note to the supplier' : 'Reason for rejecting'}
            placeholder={
              kind === 'info'
                ? 'What is missing or unclear, and what to send'
                : 'The reason the supplier will see'
            }
            submitLabel={kind === 'info' ? 'Send back' : 'Reject certificate'}
            missing={kind === 'info' ? 'a note for the supplier' : 'a reason'}
            destructive={kind === 'reject'}
            onSubmit={(note) => onDone(kind, note)}
            onCancel={onClose}
          />
        </>
      ) : null}
    </Modal>
  );
}

function Detail({
  item,
  onPin,
}: {
  item: EvidenceSubmission;
  /** Keeps this item selected once it is decided and sorts below the open ones. */
  onPin: (id: string) => void;
}) {
  const pushToast = useApp((s) => s.pushToast);
  const decide = useSvsDesk((s) => s.decideEvidence);
  const [noteKind, setNoteKind] = useState<NoteKind | null>(null);
  const outcomeRef = useRef<HTMLDivElement>(null);
  const status = evidenceStatus(item.stage);
  const open = isOpen(item);

  const closeNote = useCallback(() => setNoteKind(null), []);

  function approve() {
    onPin(item.id);
    decide(item.id, 'approved');
    pushToast(`Verified: ${item.certLabel} for ${item.supplierName}.`);
    focusSoon(() => outcomeRef.current);
  }

  function onNote(kind: NoteKind, note: string) {
    onPin(item.id);
    decide(item.id, kind === 'info' ? 'info-requested' : 'rejected', note);
    pushToast(
      kind === 'info'
        ? `Sent back to ${item.supplierName} with your note.`
        : `Rejected: ${item.certLabel} for ${item.supplierName}.`,
    );
    setNoteKind(null);
    focusSoon(() => outcomeRef.current);
  }

  const fields: [string, string][] = [
    ['Supplier', item.supplierName],
    ['Certificate type', item.certType],
    ['Issuing body', item.issuer],
    ['Reference', item.reference],
    ['Issued', formatDateGB(item.issuedOn)],
    ['Expires', formatDateGB(item.expiresOn)],
    ['Days to expiry when sent', `${item.daysLeft.toLocaleString('en-GB')} days`],
    ['Kind', item.kind === 'renewal' ? 'Renewal of a certificate held' : 'New to this supplier'],
  ];

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <Eyebrow>
            {item.id} · {item.kind === 'renewal' ? 'Renewal' : 'New certificate'}
          </Eyebrow>
          <h2
            id="evidence-detail-title"
            tabIndex={-1}
            className="mt-1 font-display text-[18px] leading-snug font-bold tracking-[-0.01em]"
          >
            {item.certLabel}
          </h2>
          <p className="mt-0.5 text-[13px] text-ink-soft">
            {item.supplierName} · {submittedLine(item.submittedAt)}
          </p>
        </div>
        <Pill tone={status.tone}>{status.label}</Pill>
      </div>

      <div className="mt-4">
        <DocumentPreview item={item} />
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-x-6 border-t border-line pt-3.5 sm:grid-cols-2">
        {fields.map(([k, v]) => (
          <div
            key={k}
            className="flex justify-between gap-4 border-b border-dashed border-line py-2 sm:block sm:border-b-0 sm:py-1.5"
          >
            <dt className="text-[12px] text-ink-soft">{k}</dt>
            <dd className="text-right text-[13.5px] font-semibold text-ink sm:mt-0.5 sm:text-left">
              {v}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 border-t border-line pt-4">
        {open ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={approve} className="max-sm:w-full">
                <Icon name="badge-check" size={16} />
                Approve
              </Button>
              <Button variant="ghost" onClick={() => setNoteKind('info')} className="max-sm:w-full">
                Request information
              </Button>
              <Button
                variant="ghost"
                onClick={() => setNoteKind('reject')}
                className="text-danger! hover:border-danger! max-sm:w-full"
              >
                Reject
              </Button>
            </div>
            <p className="mt-2.5 text-[12.5px] text-ink-soft">
              {item.kind === 'renewal'
                ? `Approving puts this renewal on file in place of the certificate ${item.supplierName} holds now.`
                : `Approving adds the certificate to ${item.supplierName}’s record — the register, their profile and their dashboard.`}
            </p>
          </>
        ) : (
          <div
            ref={outcomeRef}
            tabIndex={-1}
            className={`rounded-lg px-3.5 py-3 text-[13.5px] ${
              item.stage === 'approved'
                ? 'bg-success-soft text-success'
                : item.stage === 'rejected'
                  ? 'bg-danger-soft text-danger'
                  : 'bg-warn-soft text-warn'
            }`}
          >
            <p className="font-bold">
              {item.stage === 'approved'
                ? item.kind === 'renewal'
                  ? '✓ Verified — the renewal is on file'
                  : `✓ Verified — now on ${item.supplierName}’s record`
                : item.stage === 'rejected'
                  ? '✗ Rejected'
                  : '⚠ Sent back — more information needed'}
            </p>
            {item.note ? <p className="mt-1 text-ink">Your note: {item.note}</p> : null}
          </div>
        )}
      </div>

      <section className="mt-5 border-t border-line pt-4" aria-labelledby="evidence-trail">
        <h3 id="evidence-trail" className="font-display text-[15px] font-bold">
          Audit trail
        </h3>
        <p className="mt-0.5 text-[12px] text-ink-soft">Newest first · recorded by role</p>
        <AuditTrail trail={item.trail} className="mt-3" />
      </section>

      <NoteDialog kind={noteKind} item={item} onClose={closeNote} onDone={onNote} />
    </>
  );
}

export function EvidenceQueue() {
  const evidence = useSvsDesk((s) => s.evidence);
  const queue = useMemo(() => sortQueue(evidence), [evidence]);
  const [pinned, setPinned] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const waiting = evidenceOpenCount(evidence);

  // The first open item leads until someone picks one; a pick sticks, so a
  // decision does not whisk the detail away to the next item.
  const selected = queue.find((e) => e.id === pinned) ?? queue[0] ?? null;

  function select(id: string) {
    setPinned(id);
    // Stacked on a phone: bring the detail up to meet the pick.
    if (window.matchMedia('(max-width: 1023px)').matches) {
      focusSoon(() => {
        detailRef.current?.scrollIntoView({ block: 'start' });
        return detailRef.current?.querySelector<HTMLElement>('#evidence-detail-title');
      });
    }
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <section
        aria-labelledby="evidence-list-title"
        className="rounded-brand border border-line bg-white p-3 shadow-card sm:p-4 lg:sticky lg:top-[74px]"
      >
        <div className="px-1.5 pb-3">
          <h2
            id="evidence-list-title"
            className="font-display text-[15.5px] font-bold tracking-[-0.01em]"
          >
            Evidence queue
          </h2>
          <p className="mt-0.5 text-[12.5px] text-ink-soft">
            {waiting
              ? `${waiting} awaiting review · open items first, newest first`
              : 'Nothing awaiting review · decided items below'}
          </p>
        </div>
        {queue.length ? (
          <ul data-testid="evidence-list" className="flex flex-col gap-1">
            {queue.map((e) => (
              <QueueRow key={e.id} item={e} selected={selected?.id === e.id} onSelect={select} />
            ))}
          </ul>
        ) : (
          <p className="px-1.5 text-[13px] text-ink-soft">No evidence has been sent in.</p>
        )}
      </section>

      <div
        ref={detailRef}
        data-testid="evidence-detail"
        className="scroll-mt-[74px] rounded-brand border border-line bg-white p-[22px] shadow-card"
      >
        {selected ? (
          <Detail key={selected.id} item={selected} onPin={setPinned} />
        ) : (
          <p className="text-[13px] text-ink-soft">Pick an item to review it.</p>
        )}
      </div>
    </div>
  );
}
