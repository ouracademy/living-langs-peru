import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { languages } from "@/lib/languages";
import { cn } from "@/lib/utils";
import { HeaderPlataform } from "@/components/header";
import { SponsorsSection } from "@/components/sponsors";
import { Support } from "@/components/support";
import { HelpEducation } from "@/components/help-education";
import { Footer } from "@/components/footer";
import Stories from "@/components/stories";

export default function Home() {
  return (
    <div>
      <HeaderPlataform />
      <main className="flex flex-1 flex-col">
        <section
          className="bg-primary px-6 py-16 text-center text-primary-foreground bg-cover bg-no-repeat bg-center min-h-[400px]"
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
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                )}
              >
                {language.name}
              </Link>
            ))}
          </nav>
        </section>
        <section className="relative pt-16 pb-10 overflow-hidden">
          <div className="absolute rounded-full opacity-85 blur-[2px] w-[220px] h-[220px] bg-[#F2B705] -top-16 right-32 z-[1]" />
          <div className="absolute rounded-full opacity-50 blur-[2px] w-[160px] h-[160px] bg-[#1B98A0] -bottom-10 -left-10 z-[1]" />

          <div className="max-w-[1180px] mx-auto px-8 grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-10 items-center relative z-[2]">
            <div>
              <span className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full font-bold text-sm shadow-[0_2px_0_rgba(36,29,20,0.08)]">
                <span className="w-2 h-2 rounded-full bg-[#E4572E]" />
                Asháninka · Uro
              </span>
              <h1 className="font-['Baloo_2',sans-serif] font-bold text-4xl md:text-5xl leading-tight my-4">
                Aprende, juega y <span className="text-[#E4572E]">celebra</span>{" "}
                las lenguas del <span className="text-[#1B98A0]">Perú</span>
              </h1>
              <p className="text-lg text-[#4A4130] max-w-[38ch] mb-6">
                Diccionario, traductor, chatbot, juegos y videos para aprender
                Asháninka y Uro de forma divertida.
              </p>
              <div className="flex gap-3.5 flex-wrap mt-6">
                <a
                  href="#lenguas"
                  className="font-['Baloo_2',sans-serif] font-bold text-sm px-6.5 py-3.5 rounded-full inline-block bg-[#E4572E] text-white hover:bg-[#C7431C]"
                >
                  Elegir una lengua
                </a>
                <a
                  href="#educacion"
                  className="font-['Baloo_2',sans-serif] font-bold text-sm px-6.5 py-3.5 rounded-full inline-block border-2 border-[#241D14] text-[#241D14] hover:bg-[#241D14] hover:text-[#FFF7E8]"
                >
                  Aprende jugando
                </a>
              </div>
            </div>

            <div className="relative z-[2]">
              <svg
                viewBox="0 0 420 380"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-auto"
              >
                <circle cx="210" cy="190" r="150" fill="#F2B705" opacity=".9" />
                <path
                  d="M210 60 C 260 100 260 160 210 200 C 160 160 160 100 210 60Z"
                  fill="#E4572E"
                />
                <path
                  d="M110 220 C 150 250 150 300 110 330 C 70 300 70 250 110 220Z"
                  fill="#1B98A0"
                />
                <path
                  d="M310 220 C 350 250 350 300 310 330 C 270 300 270 250 310 220Z"
                  fill="#6A3E8C"
                />
                <circle cx="210" cy="330" r="18" fill="#241D14" />
              </svg>
            </div>
          </div>
        </section>
        <HelpEducation />
        <Stories />
        <Support />
        <SponsorsSection />
        <Footer />
      </main>
    </div>
  );
}
