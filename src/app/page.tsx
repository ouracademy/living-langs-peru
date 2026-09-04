import { HeaderPlataform } from "@/components/header";
import { SponsorsSection } from "@/components/sponsors";
import { Support } from "@/components/support";
import { HelpEducation } from "@/components/help-education";
import { Footer } from "@/components/footer";
import Stories from "@/components/stories";
import Language from "@/components/language";
import Resources from "@/components/resources";

export default function Home() {
  return (
    <div>
      <HeaderPlataform />
      <main className="flex flex-1 flex-col">
        <section
          className="relative bg-primary px-6 py-16 text-center text-primary-foreground bg-cover bg-no-repeat bg-center min-h-[400px]"
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
        <Language />
        <Resources />
        <HelpEducation />
        <Stories />
        <Support />
        <SponsorsSection />
        <Footer />
      </main>
    </div>
  );
}
