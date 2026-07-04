import type { ReactNode } from 'react';
import { useFocusTrap } from '../../lib/useFocusTrap';

/**
 * Right slide-over drawer, 400px — used for the Outlook add-in preview
 * (Outlook-blue header when outlookHeader is set). Rendered only while
 * open: no off-canvas element to leak horizontal overflow or hidden
 * focusables.
 */
export function Drawer({
  open,
  onClose,
  title,
  outlookHeader,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  outlookHeader?: boolean;
  children: ReactNode;
}) {
  const ref = useFocusTrap<HTMLDivElement>(open, onClose);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[75] bg-ink/30" onClick={onClose} aria-hidden="true" />
      <aside
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed top-0 right-0 z-[80] flex h-dvh w-[400px] max-w-[92vw] animate-[drawer-in_0.3s_ease] flex-col border-l border-line-strong bg-white shadow-[-8px_0_30px_rgba(10,37,64,0.18)]"
      >
        <div
          className={`flex items-center justify-between px-4.5 py-3.5 text-white ${
            outlookHeader ? 'bg-[#0F6CBD]' : 'bg-ink'
          }`}
        >
          <span className="text-[14px] font-bold">{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="cursor-pointer border-none bg-transparent p-1 text-xl leading-none text-white"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4.5 py-4 text-[13.5px]">{children}</div>
      </aside>
    </>
  );
}
