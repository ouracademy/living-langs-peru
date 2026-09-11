import { SponsorsSection } from "@/components/sponsors";
import { Support } from "@/components/support";
import { HelpEducation } from "@/components/help-education";
import Stories from "@/components/stories";
import Language from "@/components/language";
import Resources from "@/components/resources";
import Hero from "@/components/hero";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <Hero />
      <Language />
      <Resources />
      <HelpEducation />
      <Stories />
      <Support />
      <SponsorsSection />
    </main>
  );
}
