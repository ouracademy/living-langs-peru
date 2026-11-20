"use client";

import { useEffect, useRef, useState } from "react";

import {
  checkItemFields,
  type FieldErrors,
  type ItemFields,
  type ItemPatch,
} from "@/lib/language-packs/edit-pack";
import { itemAnchor } from "@/lib/language-packs/pack-file";
import type { PackItem, PackSource, Theme } from "@/lib/language-packs/types";

import { ItemFieldInputs } from "./item-fields";
import {
  checkboxLabel,
  dangerButton,
  primaryButton,
  secondaryButton,
} from "./styles";

type EditorRowProps = {
  theme: Theme;
  item: PackItem;
  lang: string;
  source: PackSource | undefined;
  onSave: (patch: ItemPatch) => void;
  onRemove: () => void;
};

type Mode = "view" | "edit" | "remove";

/**
 * One word of the theme: its data, a «Verificada» checkbox saved on change,
 * and «Editar» / «Quitar» in the same row (spec §9.5 E5). Focus goes back to
 * the button that opened a form when it closes.
 */
export function EditorRow({
  theme,
  item,
  lang,
  source,
  onSave,
  onRemove,
}: EditorRowProps) {
  const anchor = itemAnchor(theme.id, item.id);
  const [mode, setMode] = useState<Mode>("view");
  const [values, setValues] = useState<ItemFields>({
    word: item.word,
    translation: item.translation,
    emoji: item.emoji ?? "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const editButton = useRef<HTMLButtonElement>(null);
  const removeButton = useRef<HTMLButtonElement>(null);
  const cancelRemove = useRef<HTMLButtonElement>(null);
  const firstField = `${anchor}-word`;
  /** Where focus goes once the row re-renders in its new mode. */
  const pendingFocus = useRef<"field" | "cancel" | "edit" | "remove" | null>(
    null,
  );

  useEffect(() => {
    const target = pendingFocus.current;
    pendingFocus.current = null;
    if (target === "field") document.getElementById(firstField)?.focus();
    if (target === "cancel") cancelRemove.current?.focus();
    if (target === "edit") editButton.current?.focus();
    if (target === "remove") removeButton.current?.focus();
  }, [mode, firstField]);

  function openEdit() {
    setValues({
      word: item.word,
      translation: item.translation,
      emoji: item.emoji ?? "",
    });
    setErrors({});
    pendingFocus.current = "field";
    setMode("edit");
  }

  function openRemove() {
    pendingFocus.current = "cancel";
    setMode("remove");
  }

  function close(from: "edit" | "remove") {
    pendingFocus.current = from;
    setMode("view");
  }

  function save() {
    const found = checkItemFields(values, theme, item.id);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = (["word", "translation", "emoji"] as const).find(
        (name) => found[name],
      );
      document.getElementById(`${anchor}-${first}`)?.focus();
      return;
    }
    onSave({
      word: values.word,
      translation: values.translation,
      emoji: values.emoji,
    });
    close("edit");
  }

  return (
    <li
      id={anchor}
      tabIndex={-1}
      className="scroll-mt-24 rounded-xl bg-white px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#241D14]"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="min-w-0 break-words">
          {item.emoji ? (
            <span aria-hidden="true" className="mr-1 text-xl">
              {item.emoji}
            </span>
          ) : null}
          <span lang={lang} className="font-bold">
            {item.word}
          </span>{" "}
          — {item.translation}
          <span className="block text-sm text-[#4A4130]">
            {item.verified ? "✓ Verificada" : "⚠ Sin verificar"} ·{" "}
            {item.emoji ? "con dibujo" : "sin dibujo"} ·{" "}
            {source ? `Fuente: ${source.title}` : "Sin fuente: no se juega"}
            {item.sourceRef ? `, ${item.sourceRef}` : ""}
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className={checkboxLabel}>
            <input
              type="checkbox"
              checked={item.verified}
              aria-label={`Verificada: ${item.word}`}
              onChange={(event) => onSave({ verified: event.target.checked })}
              className="size-5 accent-[#1B6E73]"
            />
            Verificada
          </label>
          {mode === "view" ? (
            <>
              <button
                ref={editButton}
                type="button"
                aria-label={`Editar «${item.word}»`}
                onClick={openEdit}
                className={secondaryButton}
              >
                Editar
              </button>
              <button
                ref={removeButton}
                type="button"
                aria-label={`Quitar «${item.word}» de este tema`}
                onClick={openRemove}
                className={dangerButton}
              >
                Quitar
              </button>
            </>
          ) : null}
        </div>
      </div>

      {mode === "remove" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm">
            ¿Quitar «<span lang={lang}>{item.word}</span>» de «{theme.name}»?
            Sigue en los otros temas.
          </span>
          <button type="button" onClick={onRemove} className={dangerButton}>
            Sí, quitar
          </button>
          <button
            ref={cancelRemove}
            type="button"
            onClick={() => close("remove")}
            className={secondaryButton}
          >
            Cancelar
          </button>
        </div>
      ) : null}

      {mode === "edit" ? (
        <form
          className="mt-3 flex flex-col gap-3"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") close("edit");
          }}
        >
          <ItemFieldInputs
            idPrefix={anchor}
            values={values}
            errors={errors}
            lang={lang}
            onChange={setValues}
          />
          <p className="text-xs text-[#4A4130]">
            El cambio se aplica en todos los temas donde está esta palabra.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className={primaryButton}>
              Guardar
            </button>
            <button
              type="button"
              onClick={() => close("edit")}
              className={secondaryButton}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}
    </li>
  );
}
