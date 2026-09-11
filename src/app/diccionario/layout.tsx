import { Footer } from "@/components/footer";
import { HeaderPlataform } from "@/components/header";

/**
 * Gives the dictionary the same chrome as the home page. The home composes
 * these in its own page.tsx rather than in a layout, so they are repeated
 * here; moving both into the root layout would be the real fix, and would
 * also give /ashaninka and /lenguas/[slug] the chrome they currently lack.
 */
export default function DictionaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div
        className="h-3 w-full"
        style={{
          background:
            "repeating-linear-gradient(90deg, #E4572E 0 60px, #F2B705 60px 110px, #1B98A0 110px 190px, #6A3E8C 190px 230px)",
        }}
      />
      <HeaderPlataform />
      {children}
      <Footer />
    </>
  );
}
