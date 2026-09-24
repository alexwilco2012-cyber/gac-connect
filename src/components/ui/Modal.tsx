import type { ReactNode } from 'react';
import { useFocusTrap } from '../../lib/useFocusTrap';

/** Width of the dialog: `md` (460px) for a form, `lg` (720px) for a review
 *  panel with a checklist and a trail beside the actions (23 Sep). */
export type ModalSize = 'md' | 'lg';

const WIDTHS: Record<ModalSize, string> = {
  md: 'max-w-[460px]',
  lg: 'max-w-[720px]',
};

/** Centred modal — focus-trapped, Escape closes (02 §components). */
export function Modal({
  open,
  onClose,
  labelledBy,
  size = 'md',
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  size?: ModalSize;
  children: ReactNode;
}) {
  const ref = useFocusTrap<HTMLDivElement>(open, onClose);

  if (!open) return null;

  // Above the tour card (z-95), so a presenter running the tour never finds
  // the card over a dialog's buttons; toasts (z-100) still show on top.
  return (
    <div
      className="fixed inset-0 z-[96] grid place-items-center bg-ink/45 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`max-h-[calc(100dvh-2rem)] w-full ${WIDTHS[size]} overflow-y-auto rounded-[14px] bg-white p-6 shadow-card`}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}
