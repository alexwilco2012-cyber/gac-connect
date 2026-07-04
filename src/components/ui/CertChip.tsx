import type { Cert } from '../../lib/svs';

const STYLES: Record<Cert['state'], string> = {
  ok: 'bg-success-soft text-success',
  due: 'bg-warn-soft text-warn',
  lapsed: 'bg-danger-soft text-danger',
};

/** Certificate status chip for compliance tables (02 §components). */
export function CertChip({ cert }: { cert: Cert }) {
  const suffix =
    cert.state === 'due' && cert.daysToExpiry !== undefined
      ? ` · ${cert.daysToExpiry} days`
      : cert.state === 'lapsed'
        ? ' · lapsed'
        : '';
  return (
    <span
      className={`m-0.5 inline-block rounded-md px-2 py-0.5 text-[11.5px] font-bold ${STYLES[cert.state]}`}
    >
      {cert.name}
      {suffix}
    </span>
  );
}
