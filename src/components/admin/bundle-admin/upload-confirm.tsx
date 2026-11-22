"use client";

import type { BundleDiff } from "@/lib/language-bundles/bundle-file";

import { dangerButton, panel, secondaryButton } from "../pack-admin/styles";

type UploadConfirmProps = {
  fileName: string;
  diff: BundleDiff;
  onConfirm: () => void;
  onCancel: () => void;
};

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function IdList({ title, ids }: { title: string; ids: string[] }) {
  if (ids.length === 0) return null;
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-sm font-bold">{title}</summary>
      <p className="mt-1 text-sm break-words text-[#4A4130]">
        {ids.join(", ")}
      </p>
    </details>
  );
}

/**
 * The summary an upload shows before it replaces content that is already
 * there (spec gestor-lenguas decision #13, AC-L4-2). Nothing changes until the
 * editor confirms.
 */
export function UploadConfirm({
  fileName,
  diff,
  onConfirm,
  onCancel,
}: UploadConfirmProps) {
  return (
    <section aria-labelledby="confirmar-subida" className={panel}>
      <h3
        id="confirmar-subida"
        tabIndex={-1}
        // Focus lands here when the summary opens, without an effect.
        ref={(node) => node?.focus()}
        className="text-lg font-bold focus-visible:outline-2 focus-visible:outline-[#241D14]"
      >
        ¿Reemplazar el contenido con «{fileName}»?
      </h3>
      <ul className="mt-2 list-disc pl-5">
        <li>{plural(diff.added.length, "palabra nueva", "palabras nuevas")}</li>
        <li>
          {plural(
            diff.changed.length,
            "palabra cambiada",
            "palabras cambiadas",
          )}
        </li>
        <li>
          {plural(
            diff.missing.length,
            "palabra que falta",
            "palabras que faltan",
          )}{" "}
          en el archivo: se quitarán
        </li>
        {diff.restChanged ? (
          <li>También cambian el alfabeto, las fuentes o los temas.</li>
        ) : null}
      </ul>
      <IdList title="Ver las nuevas" ids={diff.added} />
      <IdList title="Ver las cambiadas" ids={diff.changed} />
      <IdList title="Ver las que se quitan" ids={diff.missing} />
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={onConfirm} className={dangerButton}>
          Reemplazar la copia de trabajo
        </button>
        <button type="button" onClick={onCancel} className={secondaryButton}>
          Cancelar
        </button>
      </div>
    </section>
  );
}
