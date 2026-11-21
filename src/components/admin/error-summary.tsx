import type { Ref } from "react";

export type SummaryProblem = { id: string; label: string; message: string };

type ErrorSummaryProps = {
  idPrefix: string;
  problems: SummaryProblem[];
  ref?: Ref<HTMLDivElement>;
};

/**
 * «Revisa N campos» with a link to each one (UI-13). Shown only when two or
 * more fields are wrong: with one, the focus goes straight to that field. The
 * parent focuses this box, so it is announced once, not as a live region.
 */
export function ErrorSummary({ idPrefix, problems, ref }: ErrorSummaryProps) {
  const titleId = `${idPrefix}-summary-title`;
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="group"
      aria-labelledby={titleId}
      className="rounded-xl border-l-[6px] border-[#C7431C] bg-[#FBEFD2] p-4 text-sm text-[#241D14] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7431C]"
    >
      <p id={titleId} className="font-bold">
        Revisa {problems.length} campos
      </p>
      <ul className="mt-2 flex flex-col gap-1">
        {problems.map((problem) => (
          <li key={problem.id}>
            <a
              href={`#${problem.id}`}
              onClick={(event) => {
                event.preventDefault();
                document.getElementById(problem.id)?.focus();
              }}
              className="font-bold text-[#C7431C] underline underline-offset-2"
            >
              {problem.label}
            </a>
            : {problem.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
