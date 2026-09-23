import { Icon } from '../../../components/ui/Icon';
import type { EvidenceSubmission } from '../../../data/svsDesk';
import { fileSizeLabel, formatDateGB } from '../../../lib/svsDesk';

/** The seal's scalloped edge: 18 points alternating between two radii. */
const SEAL_POINTS = Array.from({ length: 36 }, (_, i) => {
  const r = i % 2 === 0 ? 23 : 20;
  const a = (Math.PI * i) / 18 - Math.PI / 2;
  return `${(24 + r * Math.cos(a)).toFixed(2)},${(24 + r * Math.sin(a)).toFixed(2)}`;
}).join(' ');

/** The seal: a scalloped rosette with a tick, drawn in sea — never gold. */
function Seal() {
  return (
    <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true" className="shrink-0">
      <polygon points={SEAL_POINTS} fill="#E8F1F7" stroke="#0E5E8A" strokeWidth="1.25" />
      <circle cx="24" cy="24" r="14.5" fill="none" stroke="#0E5E8A" strokeWidth="1.25" />
      <circle
        cx="24"
        cy="24"
        r="12"
        fill="none"
        stroke="#0E5E8A"
        strokeWidth="0.75"
        strokeDasharray="1.5 1.5"
      />
      <path
        d="m18.5 24.5 3.6 3.6 7.4-7.6"
        fill="none"
        stroke="#0E5E8A"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * What the SVS team sees of a submission (spec §4.5): a mock of the
 * certificate on a light grid, watermarked SPECIMEN — the upload is
 * simulated, so there is no real document to show, and the page says so.
 * The fields beside it are the record; this is the picture of it.
 */
export function DocumentPreview({ item }: { item: EvidenceSubmission }) {
  return (
    <figure data-testid="document-preview" className="m-0">
      <div
        className="rounded-lg border border-line p-3 sm:p-5"
        style={{
          backgroundColor: '#F4F7FA',
          backgroundImage:
            'linear-gradient(#E5EAF1 1px, transparent 1px), linear-gradient(90deg, #E5EAF1 1px, transparent 1px)',
          backgroundSize: '16px 16px',
          backgroundPosition: '-1px -1px',
        }}
      >
        <div
          role="img"
          aria-label={`Illustrative preview of ${item.fileName}: ${item.certLabel}, issued to ${item.supplierName} by ${item.issuer}, reference ${item.reference}, expires ${formatDateGB(item.expiresOn)}.`}
          className="relative mx-auto max-w-[460px] overflow-hidden rounded-[4px] bg-white p-1.5 shadow-[0_6px_20px_rgba(10,37,64,0.12)]"
        >
          <div className="relative overflow-hidden rounded-[2px] border border-[#CFE2EE] px-4 py-4 sm:px-6 sm:py-5">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 grid place-items-center"
            >
              <span className="-rotate-[16deg] font-display text-[16px] font-bold tracking-[0.06em] whitespace-nowrap text-ink/[0.07] sm:text-[28px]">
                SPECIMEN — illustrative
              </span>
            </span>
            <div className="relative">
              <p className="text-[9.5px] font-extrabold tracking-[0.2em] text-sea uppercase">
                {item.kind === 'renewal' ? 'Certificate · renewal' : 'Certificate'}
              </p>
              <p className="mt-1.5 font-display text-[16px] leading-tight font-bold text-ink sm:text-[18px]">
                {item.certLabel}
              </p>
              <p className="mt-2.5 text-[10.5px] text-ink-soft">Issued to</p>
              <p className="text-[13px] font-bold text-ink">{item.supplierName}</p>
              <div className="mt-3 flex items-end justify-between gap-3 border-t border-[#E5EAF1] pt-3">
                <div className="min-w-0 text-[11px] leading-relaxed text-ink-soft">
                  <p>
                    Issued by <span className="font-semibold text-ink">{item.issuer}</span>
                  </p>
                  <p>
                    Reference{' '}
                    <span className="font-semibold text-ink tabular-nums">{item.reference}</span>
                  </p>
                  <p className="tabular-nums">
                    Issued {formatDateGB(item.issuedOn)} · Expires {formatDateGB(item.expiresOn)}
                  </p>
                </div>
                <Seal />
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px]">
        <Icon name="file-check" size={15} className="shrink-0 text-sea" />
        <span className="font-semibold text-ink">
          {item.fileName} · {fileSizeLabel(item.fileSize)}
        </span>
        <span className="text-ink-soft">
          — a simulated upload: only the name and size are kept.
        </span>
      </figcaption>
    </figure>
  );
}
