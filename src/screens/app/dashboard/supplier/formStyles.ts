/**
 * Field classes shared by the supplier's two modals (quote, certificate). They
 * match the working screens' forms (Logistics, crew change), so a field looks
 * the same wherever it is filled in.
 */

export const INPUT =
  'mt-1 block min-h-[44px] w-full rounded-lg border-[1.5px] border-line-strong bg-white px-2.5 py-2 text-[13.5px] font-semibold text-ink placeholder:font-normal placeholder:text-[#5B6B7F] focus:border-sea';

export const LABEL = 'block text-[12.5px] font-semibold text-ink-soft';

/** A read-only field — a locked value the supplier can see but not change. */
export const READONLY_INPUT =
  'mt-1 block min-h-[44px] w-full cursor-default rounded-lg border-[1.5px] border-line bg-paper px-2.5 py-2 text-[13.5px] font-semibold text-ink';
