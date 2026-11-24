import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";

import { checkBasicAuth } from "@/lib/admin/basic-auth";
import { summarizeBundle } from "@/lib/language-bundles/bundle-file";
import { readCurrentBundle } from "@/lib/language-bundles/publishing";
import { BUNDLE_LANGUAGES } from "@/lib/language-bundles/types";
import { getLanguage } from "@/lib/languages";
import { getOptionalSupabase } from "@/lib/supabase-optional";

import { formatPublishedAt } from "@/components/admin/bundle-admin/format";

export const metadata: Metadata = {
  title: "Contenido de las lenguas",
  robots: { index: false, follow: false },
};

const container = "mx-auto w-full max-w-[960px] flex-1 px-6 py-12";

type Row =
  | { slug: string; name: string; kind: "unavailable" }
  | { slug: string; name: string; kind: "empty" }
  | {
      slug: string;
      name: string;
      kind: "published";
      version: number;
      publishedAt: string;
      entries: number;
      verified: number;
      themes: number;
    };

function statusLine(row: Row): string {
  if (row.kind === "unavailable") {
    return "No pudimos leer esta lengua en la base de datos.";
  }
  if (row.kind === "empty") return "Sin publicar.";
  return `Versión ${row.version} · ${formatPublishedAt(row.publishedAt)} · ${row.verified} de ${row.entries} palabras verificadas · ${row.themes} temas de juego`;
}

/**
 * /admin/lenguas (spec gestor-lenguas §5): the two languages and what is
 * published for each. Reads the database on every request and checks the
 * password again rather than trusting the proxy matcher.
 */
export default async function AdminLanguagesPage() {
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

  const client = getOptionalSupabase();
  const rows: Row[] = await Promise.all(
    BUNDLE_LANGUAGES.map(async (slug): Promise<Row> => {
      const name = getLanguage(slug)?.name ?? slug;
      if (!client) return { slug, name, kind: "unavailable" };
      const current = await readCurrentBundle(client, slug);
      if (!current.ok) return { slug, name, kind: "unavailable" };
      if (!current.value) return { slug, name, kind: "empty" };
      return {
        slug,
        name,
        kind: "published",
        version: current.value.version,
        publishedAt: current.value.publishedAt,
        ...summarizeBundle(current.value.bundle),
      };
    }),
  );

  return (
    <main className={container}>
      <p>
        <Link
          href="/admin"
          className="text-sm font-bold text-[#C7431C] underline underline-offset-2"
        >
          Administración
        </Link>
      </p>
      <h1 className="mt-2 text-3xl font-bold text-[#241D14]">
        Contenido de las lenguas
      </h1>
      <p className="mt-3 max-w-[65ch] text-[#4A4130]">
        Sube el JSON de cada lengua, pruébalo y publícalo. De ahí salen el
        diccionario y los juegos. Solo se muestran las palabras verificadas.
      </p>
      {client ? null : (
        <p
          role="alert"
          className="mt-6 rounded-xl bg-[#FBEFD2] px-5 py-4 text-[#241D14]"
        >
          Supabase no está configurado en este servidor. Avisa al equipo
          técnico.
        </p>
      )}
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {rows.map((row) => (
          <li key={row.slug}>
            <Link
              href={`/admin/lenguas/${row.slug}`}
              className="block min-h-11 rounded-[20px] bg-[#FBEFD2] px-6 py-5 hover:bg-[#F6E3B4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7431C]"
            >
              <span className="block text-lg font-bold text-[#241D14]">
                {row.name}
              </span>
              <span className="mt-1 block text-sm text-[#4A4130]">
                {statusLine(row)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
