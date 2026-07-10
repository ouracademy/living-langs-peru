import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { languages } from "@/lib/languages";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="bg-primary px-6 py-16 text-center text-primary-foreground">
        <h1 className="text-4xl font-bold tracking-tight">
          Lenguas originarias de Peru
        </h1>
        <p className="mt-4 text-lg text-primary-foreground/90">
          Conoce la diversidad lingüística del país
        </p>
      </section>

      <section className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12">
        <nav className="flex flex-wrap items-center justify-center gap-4">
          {languages.map((language) => (
            <Link
              key={language.slug}
              href={`/lenguas/${language.slug}`}
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              {language.name}
            </Link>
          ))}
        </nav>
      </section>
    </main>
  );
}
