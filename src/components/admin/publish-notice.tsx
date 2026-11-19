"use client";

import { CircleCheck, Clock } from "lucide-react";
import { type Ref, useEffect, useState } from "react";

import { type PublishState, watchPublication } from "@/lib/admin/publish-watch";

import { SaveProgress } from "./save-progress";

type PublishNoticeProps = {
  /** The server's answer to the save, said first. */
  message: string;
  /** The new photo's public path, watched until it answers (UI-9). */
  src: string | null;
  size?: { width: number; height: number };
  ref?: Ref<HTMLDivElement>;
  onPublished: () => void;
};

/**
 * After a save: what was done and whether the web shows it yet. Without a new
 * file to watch (edit, move, remove) it only says the save message.
 */
export function PublishNotice({
  message,
  src,
  size,
  ref,
  onPublished,
}: PublishNoticeProps) {
  const [state, setState] = useState<PublishState>("waiting");

  useEffect(() => {
    if (!src) return;
    return watchPublication(src, {
      onChange: (next) => {
        setState(next);
        if (next === "published") onPublished();
      },
    });
  }, [src, onPublished]);

  const link = (
    <a
      href="/ashaninka#galeria"
      target="_blank"
      rel="noopener noreferrer"
      className="font-bold text-[#C7431C] underline underline-offset-2"
    >
      Ver la galería
    </a>
  );

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="status"
      className="mt-6 flex flex-col gap-3 rounded-xl bg-[#FBEFD2] p-4 text-sm text-[#241D14] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7431C]"
    >
      {src && state === "published" ? (
        <p className="flex items-center gap-2">
          <CircleCheck aria-hidden className="size-5 text-[#2F6B3A]" />
          <span>
            <strong>Ya se ve en la web.</strong> {link}
          </span>
        </p>
      ) : (
        <p>
          {message} {link}
        </p>
      )}
      {src && state === "waiting" ? (
        <SaveProgress stage="publishing" size={size} />
      ) : null}
      {src && state === "slow" ? (
        <p className="flex items-start gap-2">
          <Clock aria-hidden className="size-5 shrink-0" />
          Tarda más de lo normal. La foto está guardada; si no aparece en 10
          minutos, avisa al equipo técnico.
        </p>
      ) : null}
    </div>
  );
}
