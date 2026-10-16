"use client";

import { useEffect } from "react";
import { CircleCheckIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type SnackbarProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** How long it stays before closing itself, in milliseconds. */
  duration?: number;
  className?: string;
};

// The live region is always rendered and only its content comes and goes:
// screen readers announce text added to a region that already existed, not a
// region that appears together with its text. It is `fixed`, so it must not
// sit under an ancestor with a transform, filter or `contain`.
export function Snackbar({
  open,
  onClose,
  children,
  duration = 6000,
  className,
}: SnackbarProps) {
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [open, onClose, duration]);

  return (
    <div
      role="status"
      aria-live="polite"
      data-slot="snackbar"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4"
    >
      {open ? (
        <div
          className={cn(
            "animate-in fade-in-0 slide-in-from-bottom-2 pointer-events-auto flex max-w-md items-start gap-3 rounded-lg bg-[#241D14] py-3 pr-2 pl-4 text-sm text-[#FFF7E8] shadow-lg",
            className,
          )}
        >
          <CircleCheckIcon className="mt-0.5 size-4 shrink-0 text-[#F2B705]" />
          <p className="font-bold">{children}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar aviso"
            className="ml-1 rounded-md p-1 text-[#C9BFA8] transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-[#F2B705] focus-visible:outline-none"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
