import type { ReactNode } from 'react';
import { useFocusTrap } from '../../lib/useFocusTrap';

/** Centred modal — focus-trapped, Escape closes (02 §components). */
export function Modal({
  open,
  onClose,
  labelledBy,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
}) {
  const ref = useFocusTrap<HTMLDivElement>(open, onClose);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-ink/45 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="w-full max-w-[460px] rounded-[14px] bg-white p-6 shadow-card"
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}
