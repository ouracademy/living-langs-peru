import { ExternalLink, Plus } from "lucide-react";
import type { Ref } from "react";

type GalleryHeaderProps = {
  count: number;
  max: number;
  panelId: string;
  panelOpen: boolean;
  addRef?: Ref<HTMLButtonElement>;
  onAdd: () => void;
};

/** How many photos there are, and the main action first (UI-1). */
export function GalleryHeader({
  count,
  max,
  panelId,
  panelOpen,
  addRef,
  onAdd,
}: GalleryHeaderProps) {
  const full = count >= max;
  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-[#4A4130]">
        <p className="font-bold text-[#241D14]">
          {count} de {max} fotos
          {full ? " · quita una para agregar otra" : ""}
        </p>
        <a
          href="/ashaninka#galeria"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-bold text-[#C7431C] underline underline-offset-2"
        >
          Abrir la galería pública
          <ExternalLink aria-hidden className="size-4" />
        </a>
      </div>
      <button
        ref={addRef}
        type="button"
        disabled={full}
        aria-expanded={panelOpen}
        aria-controls={panelOpen ? panelId : undefined}
        onClick={onAdd}
        className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#E4572E] px-6 text-sm font-bold text-white hover:bg-[#C7431C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7431C] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        <Plus aria-hidden className="size-4" />
        Agregar foto
      </button>
    </div>
  );
}
