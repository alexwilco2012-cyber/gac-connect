/** Category chip — pressed state is ink (02 §components). */
export function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`min-h-[36px] cursor-pointer rounded-full border-[1.5px] px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
        pressed
          ? 'border-ink bg-ink text-white'
          : 'border-line-strong bg-white text-ink-soft hover:border-sea'
      }`}
    >
      {children}
    </button>
  );
}
