"use client";

import { useEffect, useRef, useState } from "react";

import type { Theme } from "@/lib/language-packs/types";

import { primaryButton, secondaryButton } from "./styles";

type VerifyThemeProps = {
  theme: Theme;
  onConfirm: () => void;
};

/**
 * «Marcar todas como verificadas», after a confirmation that says how many
 * change and that the same words change in the other themes too (spec §9.5 E6).
 */
export function VerifyTheme({ theme, onConfirm }: VerifyThemeProps) {
  const unverified = theme.items.filter((item) => !item.verified).length;
  const [asking, setAsking] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<"cancel" | "opener" | null>(null);

  useEffect(() => {
    const target = pendingFocus.current;
    pendingFocus.current = null;
    if (target === "cancel") cancel.current?.focus();
    if (target === "opener") opener.current?.focus();
  }, [asking]);

  if (!asking) {
    return (
      <button
        ref={opener}
        type="button"
        disabled={unverified === 0}
        onClick={() => {
          pendingFocus.current = "cancel";
          setAsking(true);
        }}
        className={secondaryButton}
      >
        Marcar todas como verificadas
      </button>
    );
  }

  const words = unverified === 1 ? "palabra" : "palabras";
  return (
    <div
      role="group"
      aria-label="Confirmar"
      className="flex flex-wrap items-center gap-2 rounded-xl bg-white px-4 py-3"
    >
      <span className="text-sm">
        Se marcarán {unverified} {words} de «{theme.name}» como verificadas,
        también en los otros temas donde están. ¿Confirmas que se comprobaron?
      </span>
      <button
        type="button"
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
        className={primaryButton}
      >
        Sí, marcar {unverified}
      </button>
      <button
        ref={cancel}
        type="button"
        onClick={() => {
          pendingFocus.current = "opener";
          setAsking(false);
        }}
        className={secondaryButton}
      >
        Cancelar
      </button>
    </div>
  );
}
