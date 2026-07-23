import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { languages } from "@/lib/languages";
import { cn } from "@/lib/utils";
import { HeaderPlataform } from "@/components/header";
import { SponsorsSection } from "@/components/sponsors";
import { Support } from "@/components/support";

export default function Home() {
  return (
    <div>
      <HeaderPlataform/>
      <main className="flex flex-1 flex-col">
        <section className="bg-primary px-6 py-16 text-center text-primary-foreground bg-cover bg-no-repeat bg-center min-h-[400px]"
          style={{ backgroundImage: "url('/ash.jpg')" }}
        >
          <div className="absolute inset-0 bg-black/40 pointer-events-none" />
          <div className="relative z-10">
            <h1 className="text-4xl font-bold tracking-tight">
              Lenguas originarias de Peru
            </h1>
            <p className="mt-4 text-lg text-primary-foreground/90">
              Conoce la diversidad lingüística del país
            </p>
          </div>

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
        <Support/>
        <SponsorsSection/>
      </main>
    </div>


  );
}
