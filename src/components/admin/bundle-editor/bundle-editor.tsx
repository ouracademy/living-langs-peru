import { useId, type KeyboardEvent } from "react";

import type { EntryFilter } from "@/lib/language-bundles/edit-bundle";
import {
  EDITOR_TABS,
  type EditorTab,
} from "@/lib/language-bundles/editor-view";
import type { LanguageBundle } from "@/lib/language-bundles/types";
import type { BundleValidation } from "@/lib/language-bundles/validate";

import { AlphabetPanel } from "./alphabet-panel";
import { EntriesPanel } from "./entries-panel";
import { SourcesPanel } from "./sources-panel";
import { ThemesPanel } from "./themes-panel";
import type { EditorChange } from "./types";

type BundleEditorProps = {
  bundle: LanguageBundle;
  lang: string;
  validation: BundleValidation;
  tab: EditorTab;
  onTab: (tab: EditorTab) => void;
  filter: EntryFilter;
  onFilter: (filter: EntryFilter) => void;
  limit: number;
  onLimit: (limit: number) => void;
  onChange: EditorChange;
};

/** Arrow keys, Home and End move between tabs (WAI-ARIA tabs pattern). */
function nextTab(current: EditorTab, key: string): EditorTab | null {
  const index = EDITOR_TABS.findIndex((tab) => tab.id === current);
  const last = EDITOR_TABS.length - 1;
  const target =
    key === "ArrowRight"
      ? (index + 1) % EDITOR_TABS.length
      : key === "ArrowLeft"
        ? (index + last) % EDITOR_TABS.length
        : key === "Home"
          ? 0
          : key === "End"
            ? last
            : -1;
  return target >= 0 ? EDITOR_TABS[target].id : null;
}

function Panel(props: BundleEditorProps) {
  const { bundle, lang, onChange } = props;
  switch (props.tab) {
    case "palabras":
      return (
        <EntriesPanel
          bundle={bundle}
          lang={lang}
          onChange={onChange}
          filter={props.filter}
          onFilter={props.onFilter}
          limit={props.limit}
          onLimit={props.onLimit}
        />
      );
    case "juegos":
      return (
        <ThemesPanel
          bundle={bundle}
          lang={lang}
          warnings={props.validation.warnings}
          onChange={onChange}
        />
      );
    case "alfabeto":
      return <AlphabetPanel bundle={bundle} lang={lang} onChange={onChange} />;
    case "fuentes":
      return <SourcesPanel bundle={bundle} onChange={onChange} />;
  }
}

/**
 * The editor of the working copy (spec gestor-lenguas §5, F3): words, game
 * themes, alphabet and sources. Every change goes back up as a whole new
 * working copy, validated live by the page.
 */
export function BundleEditor(props: BundleEditorProps) {
  const baseId = useId();
  const tabId = (tab: EditorTab) => `${baseId}-pestana-${tab}`;
  const panelId = `${baseId}-panel`;

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = nextTab(props.tab, event.key);
    if (!target) return;
    event.preventDefault();
    props.onTab(target);
    document.getElementById(tabId(target))?.focus();
  }

  return (
    <section aria-labelledby={`${baseId}-titulo`} className="mt-8">
      <h2 id={`${baseId}-titulo`} className="text-xl font-bold">
        Editar
      </h2>
      <div
        role="tablist"
        aria-label="Partes del paquete"
        onKeyDown={onKeyDown}
        className="mt-3 flex flex-wrap gap-2"
      >
        {EDITOR_TABS.map((tab) => {
          const selected = tab.id === props.tab;
          return (
            <button
              key={tab.id}
              id={tabId(tab.id)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              onClick={() => props.onTab(tab.id)}
              className={`inline-flex min-h-11 items-center rounded-full px-5 py-2.5 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#241D14] ${
                selected
                  ? "bg-[#241D14] text-white"
                  : "border-2 border-[#241D14] text-[#241D14] hover:bg-[#FBEFD2]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={tabId(props.tab)}
        tabIndex={0}
        className="mt-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C7431C]"
      >
        <Panel {...props} />
      </div>
    </section>
  );
}
