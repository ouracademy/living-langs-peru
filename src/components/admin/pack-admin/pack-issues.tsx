"use client";

import { itemAnchor } from "@/lib/language-packs/pack-file";
import type { Issue, PackValidation } from "@/lib/language-packs/validate";

function IssueLine({ issue }: { issue: Issue }) {
  return (
    <li>
      {issue.themeId ? (
        <a
          href={`#${itemAnchor(issue.themeId, issue.itemId)}`}
          className="underline underline-offset-2"
        >
          {issue.message}
        </a>
      ) : (
        issue.message
      )}
    </li>
  );
}

/**
 * Errors block publishing; warnings say what will not be played and why
 * (spec §4.3). Each one links to its item in the list below (spec §9.1).
 */
export function PackIssues({ validation }: { validation: PackValidation }) {
  const { errors, warnings } = validation;

  if (errors.length === 0 && warnings.length === 0) {
    return (
      <p className="mt-4 font-bold text-[#1B6E73]">✓ Sin errores ni avisos.</p>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      {errors.length > 0 ? (
        <section
          aria-labelledby="errores-paquete"
          className="rounded-xl border-2 border-[#C7431C] bg-white px-5 py-4"
        >
          <h4 id="errores-paquete" className="font-bold text-[#C7431C]">
            ✗ {errors.length} {errors.length === 1 ? "error" : "errores"}: hay
            que corregirlos en el archivo antes de publicar
          </h4>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {errors.map((issue, index) => (
              <IssueLine key={`${issue.code}-${index}`} issue={issue} />
            ))}
          </ul>
        </section>
      ) : null}
      {warnings.length > 0 ? (
        <section
          aria-labelledby="avisos-paquete"
          className="rounded-xl bg-white px-5 py-4"
        >
          <h4 id="avisos-paquete" className="font-bold">
            ⚠ {warnings.length} {warnings.length === 1 ? "aviso" : "avisos"}: no
            impiden publicar
          </h4>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {warnings.map((issue, index) => (
              <IssueLine key={`${issue.code}-${index}`} issue={issue} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
