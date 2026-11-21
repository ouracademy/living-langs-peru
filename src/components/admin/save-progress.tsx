import { Check, Circle, LoaderCircle } from "lucide-react";

type SaveProgressProps = {
  /** Final size of the prepared photo, when there is one (add only). */
  size?: { width: number; height: number };
};

type StepState = "done" | "doing" | "todo";

const ICONS: Record<StepState, typeof Check> = {
  done: Check,
  doing: LoaderCircle,
  todo: Circle,
};

const STATE_WORDS: Record<StepState, string> = {
  done: "hecho",
  doing: "en curso",
  todo: "pendiente",
};

/**
 * The steps of a save in progress, each with an icon and words, never color
 * alone (UI-8). Saving publishes, so there is no separate «publishing» step
 * since the move to Supabase. The parent wraps it in the `role="status"` region.
 */
export function SaveProgress({ size }: SaveProgressProps) {
  const steps: { label: string; state: StepState }[] = [
    {
      label: size
        ? `Foto preparada (${size.width} × ${size.height} px)`
        : "Cambio preparado",
      state: "done",
    },
    { label: "Guardando y publicando…", state: "doing" },
  ];

  return (
    <ol className="flex flex-col gap-2 text-sm">
      {steps.map((step) => {
        const Icon = ICONS[step.state];
        return (
          <li
            key={step.label}
            className={`flex items-center gap-2 ${step.state === "todo" ? "text-[#4A4130]" : "text-[#241D14]"}`}
          >
            <Icon
              aria-hidden
              className={`size-5 shrink-0 ${step.state === "doing" ? "animate-spin motion-reduce:animate-none" : ""} ${step.state === "done" ? "text-[#2F6B3A]" : ""}`}
            />
            <span>
              {step.label}
              <span className="sr-only">{` (${STATE_WORDS[step.state]})`}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
