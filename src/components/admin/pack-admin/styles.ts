/** Shared classes of /admin/juego: 44 px targets and a visible focus ring. */
const base =
  "inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2.5 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#241D14] disabled:cursor-not-allowed disabled:opacity-50";

export const primaryButton = `${base} bg-[#E4572E] text-white hover:bg-[#C7431C]`;
export const secondaryButton = `${base} border-2 border-[#241D14] text-[#241D14] hover:bg-[#FBEFD2]`;
export const dangerButton = `${base} border-2 border-[#C7431C] text-[#C7431C] hover:bg-[#FFF7E8]`;

export const panel = "mt-6 rounded-[20px] bg-[#FBEFD2] px-6 py-5";
