import { CircleAlert, TriangleAlert } from "lucide-react";

/** Why a save did not land, as the editor needs to read it. */
export type SaveFailure = "conflict" | "offline" | { message: string };

type SaveFailureNoticeProps = {
  failure: SaveFailure;
  /** What stays safe, said first: «Tu foto y tus datos no se perdieron:». */
  kept: { conflict: string; offline: string };
  onReload: () => void;
};

const TITLES = {
  conflict: "Alguien guardó un cambio mientras editabas.",
  offline: "No hay conexión.",
} as const;

/**
 * A refused save, with what to do next (UI-12). Conflict and offline are not
 * the editor's mistake: they say what was kept, and the conflict offers
 * «Recargar la lista», which reads the branch again without touching what the
 * editor typed. Anything else is the server's own message.
 */
export function SaveFailureNotice({
  failure,
  kept,
  onReload,
}: SaveFailureNoticeProps) {
  if (typeof failure === "object") {
    return (
      <p
        role="alert"
        className="flex items-start gap-1 text-sm font-bold text-[#C7431C]"
      >
        <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
        {failure.message}
      </p>
    );
  }

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border-l-[6px] border-[#E4572E] bg-[#FBEFD2] p-4 text-sm text-[#241D14]"
    >
      <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div className="flex flex-col gap-2">
        <p>
          <span className="block font-bold">{TITLES[failure]}</span>
          {failure === "conflict"
            ? `${kept.conflict} recarga la lista y vuelve a intentar.`
            : `${kept.offline} Vuelve a intentar cuando tengas señal.`}
        </p>
        {failure === "conflict" ? (
          <button
            type="button"
            onClick={onReload}
            className="min-h-11 cursor-pointer self-start rounded-full bg-[#E4572E] px-5 text-sm font-bold text-white hover:bg-[#C7431C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7431C]"
          >
            Recargar la lista
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Maps a failed answer to what the editor sees. */
export function failureOf(answer: {
  error?: string;
  message?: string;
}): SaveFailure {
  if (answer.error === "version_conflict") return "conflict";
  if (answer.error === "offline") return "offline";
  return { message: answer.message ?? "No pudimos guardar. Intenta de nuevo." };
}
