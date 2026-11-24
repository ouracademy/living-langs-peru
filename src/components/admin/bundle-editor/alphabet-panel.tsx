import { useId, useState } from "react";
import { flushSync } from "react-dom";

import {
  addGrapheme,
  formatConfusable,
  formatVowelVariants,
  moveGrapheme,
  parseConfusable,
  parseVowelVariants,
  removeGrapheme,
  setAlphabetSource,
  setVowel,
  updateAlphabetMaps,
} from "@/lib/language-bundles/edit-bundle";
import {
  ALPHABET_ANCHOR,
  alphabetPreview,
} from "@/lib/language-bundles/editor-view";
import type { LanguageBundle } from "@/lib/language-bundles/types";

import {
  checkboxLabel,
  dangerButton,
  primaryButton,
  secondaryButton,
} from "../bundle-admin/styles";
import { SelectField, TextField } from "./fields";
import type { EditorChange } from "./types";

type AlphabetPanelProps = {
  bundle: LanguageBundle;
  lang: string;
  onChange: EditorChange;
};

const moveButton = `${secondaryButton} px-3`;

function LetterList({ bundle, onChange }: AlphabetPanelProps) {
  const listId = useId();
  const { graphemes, vowels } = bundle.alphabet;
  const buttonId = (index: number, dir: "subir" | "bajar") =>
    `${listId}-${index}-${dir}`;

  // The focus follows the letter, so it can be moved again with the keyboard.
  function move(index: number, delta: -1 | 1) {
    const letter = graphemes[index];
    flushSync(() =>
      onChange(
        moveGrapheme(bundle, index, delta),
        `«${letter}» ahora es la letra ${index + delta + 1}.`,
      ),
    );
    const same = document.getElementById(
      buttonId(index + delta, delta < 0 ? "subir" : "bajar"),
    ) as HTMLButtonElement | null;
    const other = document.getElementById(
      buttonId(index + delta, delta < 0 ? "bajar" : "subir"),
    );
    (same && !same.disabled ? same : other)?.focus();
  }

  return (
    <ol
      id={ALPHABET_ANCHOR}
      tabIndex={-1}
      aria-label="Letras del alfabeto, en orden"
      className="flex flex-col gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7431C]"
    >
      {graphemes.map((letter, index) => (
        <li
          key={letter}
          className="flex flex-wrap items-center gap-2 rounded-xl bg-white px-3 py-2"
        >
          <span className="w-8 text-sm text-[#4A4130]">{index + 1}.</span>
          <span className="w-12 text-lg font-bold">{letter}</span>
          <label className={checkboxLabel}>
            <input
              type="checkbox"
              checked={vowels.includes(letter)}
              onChange={(event) => {
                const result = setVowel(bundle, letter, event.target.checked);
                onChange(
                  result.ok ? result.bundle : null,
                  result.ok
                    ? `«${letter}» ${event.target.checked ? "es vocal" : "ya no es vocal"}.`
                    : result.reason,
                );
              }}
              className="size-5"
            />
            Vocal
          </label>
          <span className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              id={buttonId(index, "subir")}
              disabled={index === 0}
              aria-label={`Subir «${letter}»`}
              onClick={() => move(index, -1)}
              className={moveButton}
            >
              ↑
            </button>
            <button
              type="button"
              id={buttonId(index, "bajar")}
              disabled={index === graphemes.length - 1}
              aria-label={`Bajar «${letter}»`}
              onClick={() => move(index, 1)}
              className={moveButton}
            >
              ↓
            </button>
            <button
              type="button"
              aria-label={`Quitar «${letter}»`}
              onClick={() => {
                const result = removeGrapheme(bundle, letter);
                onChange(
                  result.ok ? result.bundle : null,
                  result.ok
                    ? `«${letter}» quitada del alfabeto.`
                    : result.reason,
                );
              }}
              className={`${dangerButton} px-3`}
            >
              Quitar
            </button>
          </span>
        </li>
      ))}
    </ol>
  );
}

function AddLetter({ bundle, onChange }: AlphabetPanelProps) {
  const [text, setText] = useState("");
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const result = addGrapheme(bundle, text);
        onChange(
          result.ok ? result.bundle : null,
          result.ok ? `«${text.trim()}» agregada al final.` : result.reason,
        );
        if (result.ok) setText("");
      }}
    >
      <div className="min-w-0 flex-1">
        <TextField
          label="Letra nueva"
          hint="Un dígrafo («ch», «ts») va como una sola letra. Se agrega al final: muévela a su lugar."
          value={text}
          onChange={setText}
        />
      </div>
      <button type="submit" className={primaryButton}>
        Agregar la letra
      </button>
    </form>
  );
}

function MapsForm({ bundle, onChange }: AlphabetPanelProps) {
  const [variants, setVariants] = useState(
    formatVowelVariants(bundle.alphabet.vowelVariants),
  );
  const [confusable, setConfusable] = useState(
    formatConfusable(bundle.alphabet.confusable),
  );
  const [errors, setErrors] = useState<{
    variants?: string;
    confusable?: string;
  }>({});
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const v = parseVowelVariants(variants);
        const c = parseConfusable(confusable);
        setErrors({
          variants: v.ok ? undefined : v.reason,
          confusable: c.ok ? undefined : c.reason,
        });
        if (!v.ok || !c.ok) return;
        onChange(
          updateAlphabetMaps(bundle, {
            vowelVariants: v.value,
            confusable: c.value,
          }),
          "Variantes y letras parecidas guardadas.",
        );
      }}
    >
      <TextField
        label="Variantes de vocales"
        hint="Formas que cuentan como una vocal, separadas por comas: á=a, é=e."
        value={variants}
        error={errors.variants}
        onChange={setVariants}
      />
      <TextField
        label="Letras que se confunden"
        hint="Una letra por línea, para los distractores de «Letra inicial»: ts: ch, s."
        multiline
        value={confusable}
        error={errors.confusable}
        onChange={setConfusable}
      />
      <button type="submit" className={`${secondaryButton} self-start`}>
        Guardar variantes y letras parecidas
      </button>
    </form>
  );
}

function OrderPreview({ bundle, lang }: Omit<AlphabetPanelProps, "onChange">) {
  const preview = alphabetPreview(bundle);
  return (
    <section
      aria-labelledby="vista-orden"
      className="rounded-[20px] bg-white p-4"
    >
      <h3 id="vista-orden" className="font-bold">
        Así ordena el diccionario
      </h3>
      {preview.groups.length === 0 ? (
        <p className="mt-2 text-sm">Todavía no hay palabras.</p>
      ) : (
        <dl className="mt-2 grid gap-2 sm:grid-cols-2">
          {preview.groups.map((group) => (
            <div key={group.letter} className="min-w-0">
              <dt className="font-bold">{group.letter}</dt>
              <dd lang={lang || undefined} className="text-sm break-words">
                {group.words.join(", ")}
                {group.total > group.words.length
                  ? ` y ${group.total - group.words.length} más`
                  : ""}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {preview.outside.length > 0 ? (
        <p className="mt-3 text-sm">
          ⚠ Empiezan con una letra que no está en el alfabeto:{" "}
          <span lang={lang || undefined}>{preview.outside.join(", ")}</span>
        </p>
      ) : null}
    </section>
  );
}

/** «Alfabeto»: it sets the dictionary's order and the letter games (decision #10). */
export function AlphabetPanel({ bundle, lang, onChange }: AlphabetPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-[#4A4130]">
        El orden de esta lista es el orden alfabético del diccionario. Usa ↑ y ↓
        para mover una letra.
      </p>
      <LetterList bundle={bundle} lang={lang} onChange={onChange} />
      <AddLetter bundle={bundle} lang={lang} onChange={onChange} />
      <SelectField
        label="Fuente del alfabeto"
        hint="La norma o la obra de donde se toma."
        value={bundle.alphabet.sourceId ?? ""}
        options={[
          { value: "", label: "Sin indicar" },
          ...bundle.sources.map((source) => ({
            value: source.id,
            label: source.title,
          })),
        ]}
        onChange={(sourceId) =>
          onChange(
            setAlphabetSource(bundle, sourceId),
            "Fuente del alfabeto guardada.",
          )
        }
      />
      <MapsForm bundle={bundle} lang={lang} onChange={onChange} />
      <OrderPreview bundle={bundle} lang={lang} />
    </div>
  );
}
