import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BundleAdmin } from "@/components/admin/bundle-admin/bundle-admin";
import { checkBasicAuth } from "@/lib/admin/basic-auth";
import { getLanguageCode } from "@/lib/dictionary";
import { isBundleLanguage } from "@/lib/language-bundles/admin-route";
import {
  listBundleVersions,
  readCurrentBundle,
} from "@/lib/language-bundles/publishing";
import { audioBaseUrlFrom } from "@/lib/language-packs/publishing";
import { getLanguage } from "@/lib/languages";
import { getOptionalSupabase } from "@/lib/supabase-optional";

type AdminLanguagePageProps = {
  params: Promise<{ lengua: string }>;
};

export const metadata: Metadata = {
  title: "Contenido de una lengua",
  robots: { index: false, follow: false },
};

const container = "mx-auto w-full max-w-[960px] flex-1 px-6 py-12";

function Problem({ children }: { children: string }) {
  return (
    <p
      role="alert"
      className="mt-8 rounded-xl bg-[#FBEFD2] px-5 py-4 text-[#241D14]"
    >
      {children}
    </p>
  );
}

/**
 * /admin/lenguas/[lengua] (spec gestor-lenguas §5, F2). Reads the database on
 * every request, never cached, and checks the password again.
 */
export default async function AdminLanguagePage({
  params,
}: AdminLanguagePageProps) {
  const { lengua: language } = await params;

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
  if (!isBundleLanguage(language)) notFound();

  const name = getLanguage(language)?.name ?? language;
  const client = getOptionalSupabase();

  const intro = (
    <>
      <p>
        <Link
          href="/admin/lenguas"
          className="text-sm font-bold text-[#C7431C] underline underline-offset-2"
        >
          Contenido de las lenguas
        </Link>
      </p>
      <h1 className="mt-2 text-3xl font-bold text-[#241D14]">{name}</h1>
      <p className="mt-3 max-w-[65ch] text-[#4A4130]">
        El formato está explicado en docs/gestor-lenguas/formato.md. Para salir,
        cierra el navegador.
      </p>
    </>
  );

  if (!client) {
    return (
      <main className={container}>
        {intro}
        <Problem>
          Supabase no está configurado en este servidor. Avisa al equipo
          técnico.
        </Problem>
      </main>
    );
  }

  const [current, versions] = await Promise.all([
    readCurrentBundle(client, language),
    listBundleVersions(client, language),
  ]);
  if (!current.ok || !versions.ok) {
    return (
      <main className={container}>
        {intro}
        <Problem>
          No pudimos leer esta lengua en la base de datos. Si el proyecto de
          Supabase está pausado, reactívalo desde su panel y recarga.
        </Problem>
      </main>
    );
  }

  const audioBaseUrl = audioBaseUrlFrom(process.env) ?? undefined;

  return (
    <main className={container}>
      {intro}
      <BundleAdmin
        language={language}
        name={name}
        isoCode={getLanguageCode(language) ?? ""}
        {...(audioBaseUrl ? { audioBaseUrl } : {})}
        current={current.value}
        versions={versions.value}
      />
    </main>
  );
}
