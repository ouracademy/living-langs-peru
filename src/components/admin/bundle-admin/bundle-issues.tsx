import type {
  BundleIssue,
  BundleValidation,
} from "@/lib/language-bundles/validate";

/** Shown in full up to this many; the rest is counted, not listed. */
const SHOWN = 20;

function IssueList({ issues }: { issues: BundleIssue[] }) {
  const rest = issues.length - SHOWN;
  return (
    <ul className="mt-2 list-disc pl-5 text-sm">
      {issues.slice(0, SHOWN).map((issue, index) => (
        <li key={`${issue.code}-${index}`}>{issue.message}</li>
      ))}
      {rest > 0 ? (
        <li className="list-none text-[#4A4130]">… y {rest} más.</li>
      ) : null}
    </ul>
  );
}

/**
 * Errors block publishing; warnings say what will not be shown and why (spec
 * gestor-lenguas §4.2).
 */
export function BundleIssues({ validation }: { validation: BundleValidation }) {
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
          aria-labelledby="errores-lengua"
          className="rounded-xl border-2 border-[#C7431C] bg-white px-5 py-4"
        >
          <h3 id="errores-lengua" className="font-bold text-[#C7431C]">
            ✗ {errors.length} {errors.length === 1 ? "error" : "errores"}: hay
            que corregirlos en el archivo antes de publicar
          </h3>
          <IssueList issues={errors} />
        </section>
      ) : null}
      {warnings.length > 0 ? (
        <section
          aria-labelledby="avisos-lengua"
          className="rounded-xl bg-white px-5 py-4"
        >
          <h3 id="avisos-lengua" className="font-bold">
            ⚠ {warnings.length} {warnings.length === 1 ? "aviso" : "avisos"}: no
            impiden publicar
          </h3>
          <IssueList issues={warnings} />
        </section>
      ) : null}
    </div>
  );
}
