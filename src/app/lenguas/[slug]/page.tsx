import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getLanguage, languages } from "@/lib/languages";

type LanguagePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return languages.map((language) => ({ slug: language.slug }));
}

export async function generateMetadata({
  params,
}: LanguagePageProps): Promise<Metadata> {
  const { slug } = await params;
  const language = getLanguage(slug);

  if (!language) {
    return { title: "Lengua no encontrada" };
  }

  return {
    title: language.name,
  };
}

export default async function LanguagePage({ params }: LanguagePageProps) {
  const { slug } = await params;
  const language = getLanguage(slug);

  if (!language) {
    notFound();
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{language.name}</h1>
    </main>
  );
}
