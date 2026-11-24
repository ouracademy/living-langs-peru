import type { BundleSummary } from "@/lib/language-bundles/bundle-file";

import { formatPublishedAt } from "./format";
import { panel } from "./styles";

export type Notice = {
  tone: "ok" | "problem";
  text: string;
  details?: string[];
};

/** What is on the public pages now. */
export function PublishedPanel({
  current,
  summary,
}: {
  current: { version: number; note: string; publishedAt: string } | null;
  summary: BundleSummary | null;
}) {
  return (
    <div className={panel}>
      <h2 className="font-bold">Publicado</h2>
      {current && summary ? (
        <p className="mt-1">
          Versión {current.version} · {formatPublishedAt(current.publishedAt)}
          {current.note ? ` · «${current.note}»` : ""}
          <span className="block text-sm text-[#4A4130]">
            {summary.verified} de {summary.entries} palabras verificadas ·{" "}
            {summary.themes} temas de juego
          </span>
        </p>
      ) : (
        <p className="mt-1">Todavía no hay contenido publicado.</p>
      )}
    </div>
  );
}

/** The one live region of the page: what the last action did. */
export function NoticeBox({ notice }: { notice: Notice | null }) {
  return (
    <div role="status" aria-live="polite">
      {notice ? (
        <div
          className={`mt-4 rounded-xl px-5 py-4 ${
            notice.tone === "ok"
              ? "bg-[#E6F4F1] text-[#1B4D4F]"
              : "border-2 border-[#C7431C] bg-white"
          }`}
        >
          <p className="font-bold">{notice.text}</p>
          {notice.details ? (
            <ul className="mt-2 list-disc pl-5 text-sm">
              {notice.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** The working copy's counts. */
export function DraftSummary({ summary }: { summary: BundleSummary }) {
  return (
    <p className="mt-4">
      Copia de trabajo: {summary.entries} palabras ({summary.verified}{" "}
      verificadas) · {summary.themes} temas de juego
    </p>
  );
}
