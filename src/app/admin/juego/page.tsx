import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";

import { PackAdmin } from "@/components/admin/pack-admin/pack-admin";
import { checkBasicAuth } from "@/lib/admin/basic-auth";
import { languages } from "@/lib/languages";
import { getPackClient } from "@/lib/language-packs/library";
import {
  audioBaseUrlFrom,
  listVersions,
  readCurrentPack,
} from "@/lib/language-packs/publishing";
import {
  LANGUAGES_WITHOUT_PACK,
  hasNoPack,
} from "@/lib/word-jump/availability";

export const metadata: Metadata = {
  title: "Paquetes de Saltapalabras",
  robots: { index: false, follow: false },
};

const container = "mx-auto w-full max-w-[960px] flex-1 px-6 py-12";

/**
 * /admin/juego (spec §9). Reads the database on every request, never cached,
 * and checks the password again rather than trusting the proxy matcher, like
 * /admin/fotos.
 */
export default async function AdminGamePage() {
  const authorization = (await headers()).get("authorization");
  if (checkBasicAuth(authorization) !== "ok") {
    return (
      <main className={container}>
        <h1 className="text-2xl font-bold text-[#241D14]">
          Acceso restringido
        </h1>
      </main>
    );
  }

  const client = getPackClient();
  const audioBaseUrl = audioBaseUrlFrom(process.env);

  const intro = (
    <>
      <p className="mt-2">
        <Link
          href="/admin"
          className="text-sm font-bold text-[#C7431C] underline underline-offset-2"
        >
          Administración
        </Link>
      </p>
      <h1 className="mt-2 text-3xl font-bold text-[#241D14]">
        Paquetes de Saltapalabras
      </h1>
      <p className="mt-3 max-w-[65ch] text-[#4A4130]">
        Importa el paquete de una lengua, revísalo, pruébalo y publícalo. Solo
        se juegan las palabras marcadas como verificadas. Para salir, cierra el
        navegador.
      </p>
    </>
  );

  if (!client || !audioBaseUrl) {
    return (
      <main className={container}>
        {intro}
        <p
          role="alert"
          className="mt-8 rounded-xl bg-[#FBEFD2] px-5 py-4 text-[#241D14]"
        >
          Supabase no está configurado en este servidor. Avisa al equipo
          técnico.
        </p>
      </main>
    );
  }

  const sections = await Promise.all(
    languages.map(async ({ slug, name }) => {
      if (hasNoPack(slug)) {
        return { slug, name, kind: "no-pack" as const };
      }
      const [current, versions] = await Promise.all([
        readCurrentPack(client, slug),
        listVersions(client, slug),
      ]);
      return current.ok && versions.ok
        ? {
            slug,
            name,
            kind: "ready" as const,
            current: current.value,
            versions: versions.value,
          }
        : { slug, name, kind: "unavailable" as const };
    }),
  );

  return (
    <main className={container}>
      {intro}
      {sections.map((section) =>
        section.kind === "ready" ? (
          <PackAdmin
            key={section.slug}
            language={section.slug}
            name={section.name}
            audioBaseUrl={audioBaseUrl}
            current={section.current}
            versions={section.versions}
          />
        ) : (
          <section
            key={section.slug}
            aria-labelledby={`lengua-${section.slug}`}
            className="mt-10 border-t-2 border-[#FBEFD2] pt-8"
          >
            <h2 id={`lengua-${section.slug}`} className="text-2xl font-bold">
              {section.name}
            </h2>
            <p
              role={section.kind === "unavailable" ? "alert" : undefined}
              className="mt-3 max-w-[65ch] text-[#4A4130]"
            >
              {section.kind === "no-pack"
                ? `Sin juego, por diseño. ${LANGUAGES_WITHOUT_PACK[section.slug]}`
                : "No pudimos leer esta lengua en la base de datos. Si el proyecto de Supabase está pausado, reactívalo desde su panel y recarga."}
            </p>
          </section>
        ),
      )}
    </main>
  );
}
