"use client";

import { CircleCheck } from "lucide-react";
import type { Ref } from "react";

type PublishNoticeProps = {
  /** The server's answer to the save. */
  message: string;
  ref?: Ref<HTMLDivElement>;
};

/**
 * After a save. Saving publishes (spec #15): the page is revalidated, so the
 * gallery shows the change at most one visit later. No waiting state (UI-9 is
 * simplified since the move to Supabase).
 */
export function PublishNotice({ message, ref }: PublishNoticeProps) {
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="status"
      className="mt-6 flex items-start gap-2 rounded-xl bg-[#FBEFD2] p-4 text-sm text-[#241D14] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7431C]"
    >
      <CircleCheck aria-hidden className="size-5 shrink-0 text-[#2F6B3A]" />
      <p>
        <span>{message}</span>{" "}
        <a
          href="/ashaninka#galeria"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-[#C7431C] underline underline-offset-2"
        >
          Ver la galería
        </a>{" "}
        (si no aparece, recarga esa página).
      </p>
    </div>
  );
}
