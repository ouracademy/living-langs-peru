/** Shared classes of /admin/juego: 44 px targets and a visible focus ring. */
const base =
  "inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2.5 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#241D14] disabled:cursor-not-allowed disabled:opacity-50";

export const primaryButton = `${base} bg-[#E4572E] text-white hover:bg-[#C7431C]`;
export const secondaryButton = `${base} border-2 border-[#241D14] text-[#241D14] hover:bg-[#FBEFD2]`;
export const dangerButton = `${base} border-2 border-[#C7431C] text-[#C7431C] hover:bg-[#FFF7E8]`;

export const panel = "mt-6 rounded-[20px] bg-[#FBEFD2] px-6 py-5";

/** Same field style as /admin/fotos. */
export const input =
  "min-h-11 w-full rounded-xl border-2 border-[#E8DCC4] bg-white px-3 py-2 text-[#241D14] focus-visible:border-[#241D14] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7431C] aria-[invalid=true]:border-[#C7431C]";

/** A checkbox with its text, as one 44 px target. */
export const checkboxLabel =
  "inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-bold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#241D14]";
