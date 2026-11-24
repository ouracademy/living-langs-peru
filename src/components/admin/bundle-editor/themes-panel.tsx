import { useState, type FormEvent } from "react";

import {
  addTheme,
  removeTheme,
  setThemeEntry,
  type ThemeData,
  updateTheme,
} from "@/lib/language-bundles/edit-bundle";
import { themeAnchor } from "@/lib/language-bundles/editor-view";
import {
  type BundleTheme,
  type LanguageBundle,
  THEME_MODES,
  type ThemeMode,
} from "@/lib/language-bundles/types";
import type { BundleIssue } from "@/lib/language-bundles/validate";

import {
  dangerButton,
  primaryButton,
  secondaryButton,
} from "../pack-admin/styles";
import { EntryPicker } from "./entry-picker";
import { SelectField, TextField } from "./fields";
import { MODE_LABELS } from "./labels";
import type { EditorChange } from "./types";

const MODES = THEME_MODES.map((mode) => ({
  value: mode,
  label: MODE_LABELS[mode],
}));

type ThemesPanelProps = {
  bundle: LanguageBundle;
  lang: string;
  warnings: BundleIssue[];
  onChange: EditorChange;
};

function ThemeFields({
  data,
  onData,
}: {
  data: ThemeData;
  onData: (data: ThemeData) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <TextField
        label="Nombre del tema"
        value={data.name}
        onChange={(name) => onData({ ...data, name })}
      />
      <TextField
        label="Icono (emoji)"
        value={data.icon}
        onChange={(icon) => onData({ ...data, icon })}
      />
      <SelectField
        label="Modo de juego"
        value={data.mode}
        options={MODES}
        onChange={(mode) => onData({ ...data, mode: mode as ThemeMode })}
      />
    </div>
  );
}

function ThemeCard({
  bundle,
  theme,
  lang,
  warning,
  onChange,
}: {
  bundle: LanguageBundle;
  theme: BundleTheme;
  lang: string;
  warning?: string;
  onChange: EditorChange;
}) {
  const [data, setData] = useState<ThemeData>({
    name: theme.name,
    icon: theme.icon,
    mode: theme.mode,
  });
  const [confirmRemove, setConfirmRemove] = useState(false);

  return (
    <li
      id={themeAnchor(theme.id)}
      tabIndex={-1}
      className="flex flex-col gap-4 rounded-[20px] border-2 border-[#E8DCC4] bg-white p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7431C]"
    >
      <h3 className="text-lg font-bold">
        <span aria-hidden="true">{theme.icon} </span>
        {theme.name}
      </h3>
      {warning ? (
        <p className="rounded-xl bg-[#FBEFD2] px-4 py-2 text-sm font-bold">
          ⚠ {warning}
        </p>
      ) : null}
      <ThemeFields data={data} onData={setData} />
      <div className="flex flex-wrap gap-3">
        <button
          aria-label={`Guardar el tema «${theme.name}»`}
          type="button"
          onClick={() => {
            const result = updateTheme(bundle, theme.id, data);
            onChange(
              result.ok ? result.bundle : null,
              result.ok
                ? `Tema «${data.name.trim()}» guardado.`
                : result.reason,
            );
          }}
          className={secondaryButton}
        >
          Guardar el tema
        </button>
        {confirmRemove ? (
          <>
            <button
              type="button"
              onClick={() =>
                onChange(
                  removeTheme(bundle, theme.id),
                  `Tema «${theme.name}» quitado.`,
                )
              }
              className={dangerButton}
            >
              Sí, quitar el tema
            </button>
            <button
              type="button"
              onClick={() => setConfirmRemove(false)}
              className={secondaryButton}
            >
              Cancelar
            </button>
          </>
        ) : (
          <button
            aria-label={`Quitar el tema «${theme.name}»`}
            type="button"
            onClick={() => setConfirmRemove(true)}
            className={dangerButton}
          >
            Quitar el tema
          </button>
        )}
      </div>
      <EntryPicker
        bundle={bundle}
        legend={`Palabras de «${theme.name}»`}
        selected={theme.entryIds}
        lang={lang}
        onToggle={(entryId, included) => {
          const result = setThemeEntry(bundle, theme.id, entryId, included);
          onChange(
            result.ok ? result.bundle : null,
            result.ok
              ? `Tema «${theme.name}»: ${included ? "palabra agregada" : "palabra quitada"}.`
              : result.reason,
          );
        }}
      />
    </li>
  );
}

function AddTheme({
  bundle,
  lang,
  onChange,
}: Pick<ThemesPanelProps, "bundle" | "lang" | "onChange">) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ThemeData>({
    name: "",
    icon: "",
    mode: "pic2word",
  });
  const [entryIds, setEntryIds] = useState<string[]>([]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${primaryButton} self-start`}
      >
        Agregar un tema
      </button>
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const result = addTheme(bundle, data, entryIds);
    onChange(
      result.ok ? result.bundle : null,
      result.ok ? `Tema «${data.name.trim()}» agregado.` : result.reason,
    );
    if (result.ok) setOpen(false);
  }

  return (
    <form
      onSubmit={submit}
      aria-label="Tema nuevo"
      className="flex flex-col gap-4 rounded-[20px] bg-[#FBEFD2] p-4"
    >
      <h3 className="font-bold">Tema nuevo</h3>
      <ThemeFields data={data} onData={setData} />
      <EntryPicker
        bundle={bundle}
        legend="Palabras del tema nuevo"
        selected={entryIds}
        lang={lang}
        onToggle={(entryId, included) =>
          setEntryIds((ids) =>
            included ? [...ids, entryId] : ids.filter((id) => id !== entryId),
          )
        }
      />
      <div className="flex flex-wrap gap-3">
        <button type="submit" className={primaryButton}>
          Agregar el tema
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={secondaryButton}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

/** «Juegos»: Saltapalabras' themes, which point at words and never copy them. */
export function ThemesPanel({
  bundle,
  lang,
  warnings,
  onChange,
}: ThemesPanelProps) {
  const notPlayable = new Map(
    warnings
      .filter((issue) => issue.code === "theme_not_playable" && issue.themeId)
      .map((issue) => [issue.themeId as string, issue.message]),
  );
  return (
    <div className="flex flex-col gap-5">
      <AddTheme bundle={bundle} lang={lang} onChange={onChange} />
      {bundle.themes.length === 0 ? (
        <p>Todavía no hay temas de juego.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {bundle.themes.map((theme) => (
            <ThemeCard
              key={theme.id}
              bundle={bundle}
              theme={theme}
              lang={lang}
              warning={notPlayable.get(theme.id)}
              onChange={onChange}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
