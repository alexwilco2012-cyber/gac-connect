import { useEffect } from 'react';
import { useApp } from '../../store/app';
import type { Toast } from '../../store/app';

const AUTO_DISMISS_MS = 5000;

function ToastItem({ toast }: { toast: Toast }) {
  const dropToast = useApp((s) => s.dropToast);

  useEffect(() => {
    const t = setTimeout(() => dropToast(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [toast.id, dropToast]);

  return (
    <div className="pointer-events-auto flex max-w-[560px] items-center gap-2 rounded-brand bg-ink px-5 py-3.5 text-center text-[14px] text-white shadow-card">
      {toast.tag ? (
        <span className="rounded-[5px] bg-gold px-1.5 py-0.5 text-[11.5px] font-extrabold text-ink">
          {toast.tag}
        </span>
      ) : null}
      <span>{toast.message}</span>
      <button
        type="button"
        onClick={() => dropToast(toast.id)}
        aria-label="Dismiss notification"
        className="ml-1 cursor-pointer border-none bg-transparent text-white/70 hover:text-white"
      >
        ×
      </button>
    </div>
  );
}

/** Bottom-centre toast stack — role="status", auto-dismiss ~5s (02). */
export function ToastHost() {
  const toasts = useApp((s) => s.toasts);
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
