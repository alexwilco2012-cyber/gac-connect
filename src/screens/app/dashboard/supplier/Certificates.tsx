import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExpiryBar } from '../../../../components/charts';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { CardHeader } from '../../../../components/ui/CardHeader';
import { Icon } from '../../../../components/ui/Icon';
import { Pill, StatusPill } from '../../../../components/ui/Pill';
import { DEMO_SUPPLIER_ID } from '../../../../data/desk';
import { SILVER_CITY_VAULT } from '../../../../data/supplierDesk';
import { supplierById } from '../../../../data/suppliers';
import { CERT_TYPES } from '../../../../data/svsDesk';
import {
  certsWithApproved,
  formatDateGB,
  recommendedStatus,
  vaultRows,
  type VaultRow,
} from '../../../../lib/svsDesk';
import { deriveStatus } from '../../../../lib/svs';
import { useSvsDesk } from '../../../../store/svsDesk';
import { CertificateModal, type CertModalMode } from './CertificateModal';

/**
 * Certificates (spec §3; replaces the read-only "Compliance vault"). One row
 * per certificate: issuer and reference, the days left on a 0–180 day bar
 * with the 90 / 30 / 7 alert rules drawn in, a status in words, and the
 * action that fits — upload a renewal, or send again when the SVS team asked
 * for more. What the supplier sends in joins the list as awaiting review.
 *
 * The gate is untouched: the header status reads the certificates the SVS
 * already holds (plus approved additions, which are always in date), so an
 * upload never changes whether this supplier can be booked (spec §4.4).
 */

const ADD_ID = 'supplier-add-certificate';

const GLYPH: Record<VaultRow['statusTone'], string | null> = {
  verified: '✓',
  warn: '⚠',
  danger: '✗',
  info: null,
};

function StatusBadge({ row }: { row: VaultRow }) {
  const glyph = GLYPH[row.statusTone];
  return (
    <Pill tone={row.statusTone}>
      {glyph ? <span aria-hidden="true">{glyph}</span> : <Icon name="clock" size={12} />}
      {row.statusLabel}
    </Pill>
  );
}

function barLabel(row: VaultRow): string {
  const date = formatDateGB(row.expiresOn);
  if (row.state === 'lapsed') return `${row.name}: lapsed on ${date}`;
  if (row.state === 'pending') {
    return `${row.name}: awaiting SVS review; ${row.daysLeft ?? 0} days to its expiry on ${date}`;
  }
  if (row.daysLeft === null) return `${row.name}: ${row.statusLabel.toLowerCase()}`;
  return `${row.name}: ${row.daysLeft} days left, expires ${date}`;
}

function CertRow({
  row,
  first,
  onRenew,
  onReupload,
}: {
  row: VaultRow;
  first: boolean;
  onRenew: (() => void) | null;
  onReupload: (() => void) | null;
}) {
  const noteTone =
    row.statusTone === 'danger' ? 'border-danger bg-danger-soft' : 'border-warn bg-warn-soft';
  const action = onRenew ?? onReupload;
  const actionLabel = onRenew ? 'Upload renewal' : 'Re-upload';
  const showExpiry = row.daysLeft !== null || row.state === 'lapsed';

  return (
    <li className="py-4 first:pt-3 last:pb-1">
      <p className="text-[13.5px] leading-snug font-semibold text-ink">{row.name}</p>
      <p className="mt-0.5 text-[12px] leading-snug text-ink-soft">
        {row.issuer} · <span className="tabular-nums">{row.reference}</span>
      </p>
      {showExpiry ? (
        <p className="text-[12px] leading-snug text-ink-soft tabular-nums">
          Expires {formatDateGB(row.expiresOn)}
        </p>
      ) : null}
      {showExpiry ? (
        <div className="mt-2.5">
          <ExpiryBar
            daysLeft={row.daysLeft}
            state={row.state}
            scale={first}
            label={barLabel(row)}
          />
        </div>
      ) : null}
      {/* Status on the left, the action on the right of the same line; a long
          status on a phone pushes the action under it, still right-aligned. */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <StatusBadge row={row} />
        {action ? (
          <button
            type="button"
            onClick={action}
            className="-mr-2 ml-auto inline-flex min-h-[44px] shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2 text-[12.5px] font-bold whitespace-nowrap text-sea hover:bg-sea-soft sm:-my-1.5 sm:min-h-[36px]"
          >
            <Icon name="upload" size={14} />
            {actionLabel}
            <span className="sr-only"> for {row.name}</span>
          </button>
        ) : null}
      </div>
      {row.note ? (
        <p className={`mt-2 rounded-lg border-l-4 px-3 py-2 text-[12.5px] text-ink ${noteTone}`}>
          <span className="font-bold">The SVS team: </span>
          {row.note}
        </p>
      ) : null}
    </li>
  );
}

/** "3 of 4" as four short segments: on file, with the SVS team, still to add. */
function RecommendedMeter({
  onFile,
  pending,
  total,
}: {
  onFile: number;
  pending: number;
  total: number;
}) {
  return (
    <span
      role="img"
      aria-label={`${onFile} of ${total} recommended certificates on file${
        pending ? `, ${pending} awaiting review` : ''
      }`}
      className="mt-2 flex gap-1"
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`block h-1.5 flex-1 rounded-full ${
            i < onFile ? 'bg-sea' : i < onFile + pending ? 'bg-[#A8CFE9]' : 'bg-line-strong'
          }`}
        />
      ))}
    </span>
  );
}

export function Certificates({ className = '' }: { className?: string }) {
  const evidence = useSvsDesk((s) => s.evidence);
  const supplier = supplierById(DEMO_SUPPLIER_ID)!;
  const [mode, setMode] = useState<CertModalMode | null>(null);
  const close = useCallback(() => {
    setMode(null);
    // The modal hands focus back to what opened it; if that went with the
    // change (the "add ISO 9001" link, once it is sent), land on Add instead.
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (!active || active === document.body) document.getElementById(ADD_ID)?.focus();
    });
  }, [setMode]);

  const rows = useMemo(() => vaultRows(SILVER_CITY_VAULT, evidence, DEMO_SUPPLIER_ID), [evidence]);
  const status = deriveStatus(certsWithApproved(supplier.id, supplier.certs, evidence));
  const rec = recommendedStatus(rows);
  const complete = rec.onFile === rec.total;

  function renewFor(row: VaultRow) {
    const vault = row.vaultId ? SILVER_CITY_VAULT.find((v) => v.id === row.vaultId) : undefined;
    return vault ? () => setMode({ kind: 'renewal', vault }) : null;
  }

  function reuploadFor(row: VaultRow) {
    if (row.vaultId || (row.state !== 'info' && row.state !== 'rejected')) return null;
    const submission = evidence.find((e) => e.id === row.submissionId);
    return submission ? () => setMode({ kind: 'reupload', submission }) : null;
  }

  const firstMissing = rec.missing[0];
  const addMissing = firstMissing
    ? () =>
        setMode({
          kind: 'new',
          ...(CERT_TYPES.includes(firstMissing) ? { presetType: firstMissing } : {}),
        })
    : null;

  return (
    <Card className={className} data-testid="supplier-certificates">
      <CardHeader
        title="Certificates"
        subtitle="The gate: a lapse blocks booking everywhere, immediately"
        action={<StatusPill status={status} />}
      />

      <Button id={ADD_ID} onClick={() => setMode({ kind: 'new' })} className="mt-4 w-full">
        <Icon name="file-plus" size={17} />
        Add a certificate
      </Button>

      <ul role="list" className="mt-2 list-none divide-y divide-line">
        {rows.map((row, i) => (
          <CertRow
            key={row.id}
            row={row}
            first={i === 0}
            onRenew={renewFor(row)}
            onReupload={reuploadFor(row)}
          />
        ))}
      </ul>

      {!complete ? (
        <div
          data-testid="recommended-status"
          className="mt-4 rounded-lg border border-line bg-paper px-3.5 py-3"
        >
          <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-[12.5px]">
            <span className="font-bold text-ink">Recommended for Welding</span>
            <span className="text-ink-soft tabular-nums">
              {rec.onFile} of {rec.total} on file
            </span>
          </p>
          <RecommendedMeter onFile={rec.onFile} pending={rec.pending.length} total={rec.total} />
          <div className="mt-2 flex items-start justify-between gap-3">
            <p className="min-w-0 text-[12.5px] leading-snug text-ink-soft">
              {rec.missing.length ? (
                <>
                  Add <span className="font-semibold text-ink">{rec.missing.join(' and ')}</span> to
                  complete your listing
                  {rec.pending.length ? '; ' : '.'}
                </>
              ) : null}
              {rec.pending.length ? (
                <>
                  <span className="font-semibold text-ink">{rec.pending.join(' and ')}</span>{' '}
                  awaiting SVS review.
                </>
              ) : null}
            </p>
            {addMissing ? (
              <button
                type="button"
                onClick={addMissing}
                className="-my-1.5 -mr-2 inline-flex min-h-[44px] shrink-0 cursor-pointer items-center gap-1 rounded-md px-2 text-[12.5px] font-bold whitespace-nowrap text-sea hover:bg-sea-soft sm:min-h-[36px]"
              >
                <Icon name="file-plus" size={14} />
                Add it<span className="sr-only"> — {firstMissing}</span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <p className="mt-3 text-[12.5px] text-ink-soft">
        Alerts fire at 90, 30 and 7 days before expiry. No plan, promotion or rating overrides the
        gate — the rule is set out in the{' '}
        <Link to="/app/svs" className="font-semibold text-sea">
          Supplier Vetting System
        </Link>
        .
      </p>

      <CertificateModal mode={mode} onClose={close} />
    </Card>
  );
}
