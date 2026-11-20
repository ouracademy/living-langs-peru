"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import {
  addItem,
  anchorTarget,
  filterItems,
  type ItemPatch,
  type NewItem,
  removeItem,
  updateItem,
  verifyTheme,
} from "@/lib/language-packs/edit-pack";
import { itemAnchor } from "@/lib/language-packs/pack-file";
import type { LanguagePack } from "@/lib/language-packs/types";

import { AddItemForm } from "./add-item-form";
import { EditorRow } from "./editor-row";
import { checkboxLabel, input } from "./styles";
import { VerifyTheme } from "./verify-theme";

type PackEditorProps = {
  pack: LanguagePack;
  /** Keeps the edited pack in preparation. Returns whether a copy survives the tab. */
  onChange: (pack: LanguagePack) => boolean;
};

/**
 * The minimal editor of /admin/juego (spec §9.5): one theme at a time, search
 * and filters, and per word «Verificada», «Editar» and «Quitar». Every change
 * is one write of the pack in preparation; publishing is still SP6's flow.
 */
/** The issue link the page was opened with, if any (E4). */
function initialTarget(pack: LanguagePack) {
  return typeof window === "undefined"
    ? null
    : anchorTarget(pack, window.location.hash);
}

export function PackEditor({ pack, onChange }: PackEditorProps) {
  const ids = useId();
  const lang = pack.language.isoCode;
  const [themeId, setThemeId] = useState(
    () => initialTarget(pack)?.themeId ?? pack.themes[0]?.id ?? "",
  );
  const [query, setQuery] = useState("");
  const [unverified, setUnverified] = useState(false);
  const [noEmoji, setNoEmoji] = useState(false);
  const [status, setStatus] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const packRef = useRef(pack);
  const [focusTarget, setFocusTarget] = useState<string | null>(() => {
    const target = initialTarget(pack);
    return target ? itemAnchor(target.themeId, target.itemId) : null;
  });

  useEffect(() => {
    packRef.current = pack;
  }, [pack]);

  // A theme that disappeared (a new import) falls back to the first one.
  const theme =
    pack.themes.find((candidate) => candidate.id === themeId) ?? pack.themes[0];
  const sources = useMemo(
    () => new Map(pack.sources.map((source) => [source.id, source])),
    [pack.sources],
  );
  const visible = useMemo(
    () =>
      theme ? filterItems(theme.items, { query, unverified, noEmoji }) : [],
    [theme, query, unverified, noEmoji],
  );

  // An issue link points at an item that may be in another theme or hidden by
  // a filter: show it, then move focus to it (E4).
  useEffect(() => {
    function follow() {
      const target = anchorTarget(packRef.current, window.location.hash);
      if (!target) return;
      setThemeId(target.themeId);
      setQuery("");
      setUnverified(false);
      setNoEmoji(false);
      setFocusTarget(itemAnchor(target.themeId, target.itemId));
    }
    window.addEventListener("hashchange", follow);
    return () => window.removeEventListener("hashchange", follow);
  }, []);

  useEffect(() => {
    if (!focusTarget) return;
    const element = document.getElementById(focusTarget);
    element?.scrollIntoView?.({ block: "center" });
    element?.focus();
  }, [focusTarget, themeId]);

  if (!theme) {
    return <p className="mt-4">Este paquete no tiene temas.</p>;
  }

  function save(next: LanguagePack, message: string) {
    const kept = onChange(next);
    setStatus(
      kept
        ? message
        : `${message} Ojo: no se pudo guardar una copia en este navegador; si cierras la pestaña, se pierde.`,
    );
  }

  function onSave(itemId: string, word: string, patch: ItemPatch) {
    const label =
      patch.verified === true
        ? `«${word}» marcada como verificada.`
        : patch.verified === false
          ? `«${word}» marcada sin verificar.`
          : `Cambios en «${patch.word?.trim() || word}» guardados.`;
    save(updateItem(pack, theme.id, itemId, patch), label);
  }

  function onRemove(itemId: string, word: string) {
    save(
      removeItem(pack, theme.id, itemId),
      `«${word}» quitada de «${theme.name}».`,
    );
    heading.current?.focus();
  }

  function onVerifyAll() {
    const { pack: next, changed } = verifyTheme(pack, theme.id);
    save(
      next,
      `${changed} palabras de «${theme.name}» marcadas como verificadas.`,
    );
    heading.current?.focus();
  }

  function onAdd(item: NewItem) {
    const { pack: next, itemId } = addItem(pack, theme.id, item);
    save(next, `«${item.word.trim()}» agregada a «${theme.name}».`);
    setQuery("");
    setUnverified(false);
    setNoEmoji(false);
    setFocusTarget(itemAnchor(theme.id, itemId));
  }

  const unverifiedCount = theme.items.filter((item) => !item.verified).length;
  const withoutEmoji = theme.items.filter((item) => !item.emoji).length;

  return (
    <div className="mt-4 flex flex-col gap-4">
      <p className="text-sm text-[#4A4130]">
        Los cambios se guardan en este navegador y llegan al juego cuando
        publicas.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${ids}-tema`} className="text-sm font-bold">
            Tema
          </label>
          <select
            id={`${ids}-tema`}
            value={theme.id}
            onChange={(event) => {
              setThemeId(event.target.value);
              setFocusTarget(null);
            }}
            className={input}
          >
            {pack.themes.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name} ({candidate.items.length})
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${ids}-buscar`} className="text-sm font-bold">
            Buscar palabra o traducción
          </label>
          <input
            id={`${ids}-buscar`}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={input}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
        <label className={checkboxLabel}>
          <input
            type="checkbox"
            checked={unverified}
            onChange={(event) => setUnverified(event.target.checked)}
            className="size-5 accent-[#1B6E73]"
          />
          Solo sin verificar ({unverifiedCount})
        </label>
        <label className={checkboxLabel}>
          <input
            type="checkbox"
            checked={noEmoji}
            onChange={(event) => setNoEmoji(event.target.checked)}
            className="size-5 accent-[#1B6E73]"
          />
          Solo sin dibujo ({withoutEmoji})
        </label>
      </div>

      <p
        role="status"
        aria-live="polite"
        className="min-h-6 font-bold text-[#1B4D4F]"
      >
        {status}
      </p>

      <section
        id={itemAnchor(theme.id)}
        aria-labelledby={`${ids}-titulo`}
        className="scroll-mt-24"
      >
        <h5
          id={`${ids}-titulo`}
          ref={heading}
          tabIndex={-1}
          className="text-lg font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#241D14]"
        >
          <span aria-hidden="true">{theme.icon}</span> {theme.name}{" "}
          <span className="text-sm font-normal text-[#4A4130]">
            · mostrando {visible.length} de {theme.items.length}
          </span>
        </h5>

        <div className="mt-3 flex flex-wrap gap-3">
          <VerifyTheme theme={theme} onConfirm={onVerifyAll} />
        </div>

        {visible.length === 0 ? (
          <p className="mt-4">Ninguna palabra coincide con la búsqueda.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {visible.map((item) => (
              <EditorRow
                key={item.id}
                theme={theme}
                item={item}
                lang={lang}
                source={item.sourceId ? sources.get(item.sourceId) : undefined}
                onSave={(patch) => onSave(item.id, item.word, patch)}
                onRemove={() => onRemove(item.id, item.word)}
              />
            ))}
          </ul>
        )}

        <div className="mt-4">
          <AddItemForm
            key={theme.id}
            theme={theme}
            lang={lang}
            sources={pack.sources}
            onAdd={onAdd}
          />
        </div>
      </section>
    </div>
  );
}
