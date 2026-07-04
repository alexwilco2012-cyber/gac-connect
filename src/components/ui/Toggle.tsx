/** Toggle switch — 46×26, sea when on (02 §components). */
export function Toggle({
  pressed,
  onToggle,
  label,
}: {
  pressed: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={pressed}
      aria-label={label}
      onClick={onToggle}
      className={`relative h-[26px] w-[46px] shrink-0 cursor-pointer rounded-full border-none transition-colors ${
        pressed ? 'bg-sea' : 'bg-line-strong'
      }`}
    >
      <span
        className={`absolute top-[3px] block h-5 w-5 rounded-full bg-white shadow transition-[left] ${
          pressed ? 'left-[23px]' : 'left-[3px]'
        }`}
      />
    </button>
  );
}
