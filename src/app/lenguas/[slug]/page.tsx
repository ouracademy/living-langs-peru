import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getLanguage, languages } from "@/lib/languages";
import Link from "next/link";

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

  if (language.slug === "uro") {
    return (
      <main className="flex-1 bg-[#FFF7E8] px-6 py-12 text-[#241D14] sm:py-16">
        <div className="mx-auto max-w-[960px]">
          <Link href="/" className="text-sm font-bold text-[#6A3E8C]">
            ← Volver al inicio
          </Link>
          <header className="mt-8 max-w-[68ch]">
            <span className="inline-block rounded-full bg-[#1B98A0] px-4 py-1.5 text-sm font-bold text-white">
              Pueblo Uro · lago Titicaca
            </span>
            <h1 className="mt-4 font-heading text-4xl font-bold sm:text-5xl">
              Uro: memoria de una lengua en recuperación
            </h1>
            <p className="mt-5 text-lg leading-8 text-[#4A4130]">
              El pueblo Uro conserva una historia lingüística propia. La lengua
              dejó de transmitirse como idioma de uso cotidiano hace cerca de
              un siglo; hoy, las familias Uro hablan principalmente aimara,
              además de quechua y castellano. Hay iniciativas para recuperar
              sus conocimientos.
            </p>
          </header>

          <section className="mt-12 grid gap-5 md:grid-cols-2" aria-label="Historia y documentación">
            <article className="rounded-2xl border border-[#E7DCC7] bg-white p-6">
              <h2 className="font-heading text-2xl font-bold">Una lengua documentada</h2>
              <p className="mt-3 leading-7 text-[#4A4130]">
                El uro de Ch’imu, una variedad registrada en Puno, se conoce
                por un corpus histórico de alrededor de 324 palabras. Es un
                registro limitado, recogido hace casi cien años, y no una
                descripción completa de la lengua ni una guía para aprender a
                hablarla.
              </p>
            </article>
            <article className="rounded-2xl border border-[#E7DCC7] bg-white p-6">
              <h2 className="font-heading text-2xl font-bold">Grafías históricas</h2>
              <p className="mt-3 leading-7 text-[#4A4130]">
                No se ha encontrado un alfabeto uro oficial. Las publicaciones
                históricas usan sistemas de escritura distintos, por eso sus
                formas deben leerse con su fuente y variedad; no representan
                una ortografía normalizada por el pueblo Uro.
              </p>
            </article>
          </section>

          <section className="mt-8 rounded-2xl bg-[#FBEFD2] p-6 sm:p-8">
            <h2 className="font-heading text-2xl font-bold">Cómo consultar el diccionario</h2>
            <p className="mt-3 max-w-[72ch] leading-7 text-[#4A4130]">
              El material léxico disponible es histórico y todavía no está
              verificado por hablantes. Se presenta como documentación para
              conocer y cuidar esta memoria lingüística, no como vocabulario
              de uso actual.
            </p>
            <Link
              href="/diccionario/uro"
              className="mt-5 inline-flex rounded-full bg-[#1B98A0] px-5 py-3 font-bold text-white no-underline hover:bg-[#147C82]"
            >
              Ver diccionario Uro
            </Link>
          </section>

          <footer className="mt-10 border-t border-[#E7DCC7] pt-6">
            <h2 className="font-heading text-xl font-bold">Fuentes y lecturas</h2>
            <ul className="mt-3 list-inside list-disc space-y-2 text-sm leading-6">
              <li>
                <a
                  href="https://bdpi.cultura.gob.pe/pueblos/uro"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[#6A3E8C] underline"
                >
                  Pueblo Uro — Base de Datos de Pueblos Indígenas u Originarios
                </a>{" "}
                del Ministerio de Cultura del Perú.
              </li>
              <li>
                <a
                  href="https://doi.org/10.1515/stuf-2014-0013"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[#6A3E8C] underline"
                >
                  Katja Hannß, “The Uru of Ch’imu” (2014)
                </a>{" "}
                — estudio del material recogido por Walter Lehmann.
              </li>
              <li>
                <a
                  href="https://revistas.pucp.edu.pe/index.php/lexis/es/article/view/1891"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[#6A3E8C] underline"
                >
                  Rodolfo Cerrón-Palomino, “Reconstrucción del proto-uro: fonología” (2007)
                </a>.
              </li>
            </ul>
          </footer>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{language.name}</h1>
    </main>
  );
}
