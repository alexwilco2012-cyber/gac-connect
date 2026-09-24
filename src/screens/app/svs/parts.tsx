import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import type { TrailEntry } from '../../../data/svsDesk';
import { INPUT, LABEL, focusSoon, initials } from './ui';

/** An applicant's or supplier's two-letter tile. Decorative: the name is always beside it. */
export function Monogram({ name, size = 36 }: { name: string; size?: 32 | 36 | 44 }) {
  const box =
    size === 44
      ? 'h-11 w-11 text-[15px]'
      : size === 36
        ? 'h-9 w-9 text-[13px]'
        : 'h-8 w-8 text-[12px]';
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-[10px] bg-sea-soft font-display font-bold text-sea ${box}`}
    >
      {initials(name)}
    </span>
  );
}

/** Checks done out of eight. The words carry the figure; the bar is decoration. */
export function ChecksBar({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <span aria-hidden="true" className="block h-1.5 overflow-hidden rounded-full bg-sea-soft">
      <span
        className={`block h-full rounded-full ${done === total ? 'bg-success' : 'bg-sea'}`}
        style={{ width: `${pct}%` }}
      />
    </span>
  );
}

/** The audit trail, newest first, by role — never a person's name. */
export function AuditTrail({
  trail,
  className = '',
}: {
  trail: readonly TrailEntry[];
  className?: string;
}) {
  const entries = [...trail].reverse();
  return (
    <ol data-testid="audit-trail" className={`relative ${className}`}>
      {entries.map((t, i) => (
        <li
          key={`${t.at}-${i}`}
          className="relative grid grid-cols-[14px_minmax(0,1fr)] gap-x-2.5 pb-3 last:pb-0"
        >
          <span aria-hidden="true" className="relative flex justify-center">
            <span
              className={`mt-[5px] block h-2 w-2 rounded-full ${i === 0 ? 'bg-sea' : 'border-[1.5px] border-line-strong bg-white'}`}
            />
            {i < entries.length - 1 ? (
              <span className="absolute top-[15px] -bottom-[3px] left-1/2 w-px -translate-x-1/2 bg-line" />
            ) : null}
          </span>
          <div className="min-w-0">
            <p className="text-[13px] leading-snug text-ink">{t.text}</p>
            <p className="mt-0.5 text-[11.5px] text-ink-soft tabular-nums">
              {t.by} · {t.at}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * A required note — asking for more information, declining, rejecting.
 * Nothing is sent until there is something to send: an empty submit shows one
 * "Still needed: …" line and returns focus to the box. Always rendered inside
 * a Modal, so the tour's arrow keys never fire while someone is typing.
 */
export function NoteForm({
  label,
  placeholder,
  submitLabel,
  missing,
  destructive = false,
  onSubmit,
  onCancel,
}: {
  label: string;
  placeholder: string;
  submitLabel: string;
  /** Words after "Still needed: ". */
  missing: string;
  destructive?: boolean;
  onSubmit: (note: string) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState('');
  const [tried, setTried] = useState(false);
  const empty = text.trim() === '';

  // A frame late on purpose. Where the form opens with its Modal (the evidence
  // queue's note dialog), this effect runs before the Modal's focus trap has
  // recorded the button that opened it; focusing now would have the trap hand
  // focus back to this box on close — gone by then, so focus fell to <body>.
  useEffect(() => {
    focusSoon(() => ref.current);
  }, []);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (empty) {
          setTried(true);
          ref.current?.focus();
          return;
        }
        onSubmit(text.trim());
      }}
    >
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <textarea
        id={id}
        ref={ref}
        rows={3}
        maxLength={400}
        value={text}
        placeholder={placeholder}
        aria-invalid={tried && empty ? true : undefined}
        onChange={(e) => setText(e.target.value)}
        className={`${INPUT} resize-y leading-snug font-normal`}
      />
      <p className="mt-1 text-right text-[11.5px] text-ink-soft tabular-nums">
        {text.length} / 400
      </p>
      {tried && empty ? (
        <p
          role="alert"
          className="mt-2 rounded-lg border-l-4 border-warn bg-warn-soft px-3 py-2 text-[13px] font-semibold text-warn"
        >
          Still needed: {missing}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className={destructive ? 'bg-danger! hover:bg-[#991B1B]!' : ''}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
