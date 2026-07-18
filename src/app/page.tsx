import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { languages } from "@/lib/languages";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";
import Image from "next/image";


const menuItems = [
  { label: "Languages & Resources", href: "/languages-resources" },
  { label: "Events", href: "/events" },
  { label: "Stories", href: "/stories" },
  { label: "GetInvolved", href: "/get-involved" },
];

export default function Home() {
  return (
    <div>
      <header className="flex sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <Image
              src="/logo.webp"
              alt="lingua plataform"
              width={100}
              height={100}
              style={{ height: "auto" }}
              className="object-contain"
            />
            <span>Lingua Plataform</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {menuItems.map((item) => (
              <Link href={item.href} key={item.label} className="text-base font-medium text-muted-foreground  hover:text-[#044D58] transition-colors">
                {item.label}
              </Link>
            ))}
          </nav>
          <Button variant="ghost" size="icon" className="rounded-full border h-9 w-9">
            <User className="h-4.5 w-4.5 text-muted-foreground" />
            <span className="sr-only font-normal">Usuario</span>
          </Button>
        </div>
      </header>
      <main className="flex flex-1 flex-col">
        <section className="bg-primary px-6 py-16 text-center text-primary-foreground bg-cover bg-no-repeat bg-center"
          style={{ backgroundImage: "url('/ashaninka-c.webp')" }}
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
      </main>
    </div>


  );
}
