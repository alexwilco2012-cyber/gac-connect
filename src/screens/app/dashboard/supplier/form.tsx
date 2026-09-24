import type { ReactNode } from 'react';

/**
 * Parts shared by the supplier's two modals (quote, certificate); the field
 * classes are in ./formStyles.
 */

/** The "Still needed: …" line — one alert, the form's whole to-do list. */
export function StillNeeded({ problems }: { problems: readonly string[] }) {
  if (problems.length === 0) return null;
  return (
    <p
      role="alert"
      className="mt-4 rounded-lg border-l-4 border-warn bg-warn-soft px-3 py-2 text-[12.5px] font-semibold text-warn"
    >
      Still needed: {problems.join(' · ')}
    </p>
  );
}

/** The modal's opening lines: eyebrow, the h2 the dialog is labelled by, and a lede. */
export function ModalHeading({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="pr-1">
      <p className="text-[11px] font-extrabold tracking-[0.14em] text-sea uppercase">{eyebrow}</p>
      <h2 id={id} className="mt-1 font-display text-[19px] leading-snug font-bold text-ink">
        {title}
      </h2>
      {children ? <div className="mt-1.5 text-[13px] text-ink-soft">{children}</div> : null}
    </div>
  );
}
