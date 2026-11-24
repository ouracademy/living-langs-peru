import { issueTarget } from "@/lib/language-bundles/editor-view";
import type {
  BundleIssue,
  BundleValidation,
} from "@/lib/language-bundles/validate";

/** Shown in full up to this many; the rest is counted, not listed. */
const SHOWN = 20;

type GoTo = (issue: BundleIssue) => void;

/** A problem that can be fixed in the editor links to where. */
function IssueItem({ issue, onGo }: { issue: BundleIssue; onGo?: GoTo }) {
  if (!onGo || !issueTarget(issue)) return <>{issue.message}</>;
  return (
    <button
      type="button"
      onClick={() => onGo(issue)}
      className="min-h-11 text-left underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#241D14]"
    >
      {issue.message}
    </button>
  );
}

function IssueList({ issues, onGo }: { issues: BundleIssue[]; onGo?: GoTo }) {
  const rest = issues.length - SHOWN;
  return (
    <ul className="mt-2 list-disc pl-5 text-sm">
      {issues.slice(0, SHOWN).map((issue, index) => (
        <li key={`${issue.code}-${index}`}>
          <IssueItem issue={issue} onGo={onGo} />
        </li>
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
export function BundleIssues({
  validation,
  onGo,
}: {
  validation: BundleValidation;
  /** Takes the editor to where an issue is fixed; absent, the list is plain text. */
  onGo?: GoTo;
}) {
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
            que corregirlos antes de publicar
          </h3>
          <IssueList issues={errors} onGo={onGo} />
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
          <IssueList issues={warnings} onGo={onGo} />
        </section>
      ) : null}
    </div>
  );
}
