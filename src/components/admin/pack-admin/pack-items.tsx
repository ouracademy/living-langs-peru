"use client";

import { itemAnchor } from "@/lib/language-packs/pack-file";
import type { LanguagePack } from "@/lib/language-packs/types";

/**
 * Every theme and item of the pack in preparation, so an issue can link to
 * its item and the editor can see what is verified before publishing.
 */
export function PackItems({ pack }: { pack: LanguagePack }) {
  const lang = pack.language.isoCode;
  const sources = new Map(pack.sources.map((source) => [source.id, source]));

  return (
    <div className="mt-4 flex flex-col gap-6">
      {pack.themes.map((theme) => (
        <section
          key={theme.id}
          id={itemAnchor(theme.id)}
          aria-labelledby={`${itemAnchor(theme.id)}-titulo`}
          tabIndex={-1}
          className="scroll-mt-24"
        >
          <h4 id={`${itemAnchor(theme.id)}-titulo`} className="font-bold">
            <span aria-hidden="true">{theme.icon}</span> {theme.name}{" "}
            <span className="font-normal text-[#4A4130]">({theme.mode})</span>
          </h4>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {theme.items.map((item) => (
              <li
                key={item.id}
                id={itemAnchor(theme.id, item.id)}
                tabIndex={-1}
                className="scroll-mt-24 rounded-lg bg-white px-3 py-2"
              >
                {item.emoji ? (
                  <span aria-hidden="true">{item.emoji} </span>
                ) : null}
                <span lang={lang} className="font-bold">
                  {item.word}
                </span>{" "}
                — {item.translation}
                <span className="mt-0.5 block text-[#4A4130]">
                  {item.verified ? "✓ Verificada" : "⚠ Sin verificar"} ·{" "}
                  {item.audio ? "con audio" : "sin audio"} ·{" "}
                  {item.sourceId
                    ? `Fuente: ${sources.get(item.sourceId)?.title ?? item.sourceId}`
                    : "Sin fuente"}
                  {item.sourceRef ? `, ${item.sourceRef}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
