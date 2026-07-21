import Image from "next/image"
import Link from "next/link"

const sponsors = [
  { name: "UNMSM", logo: "./UNMSM.svg", url: "https://www.unmsm.edu.pe/" },
  { name: "Gobierno", logo: "", url:"" }
]

export function SponsorsSection() {
  return (
    <section className="border-t bg-muted/30 px-6 py-16 text-center">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Sponsors</h2>
        <p className="mt-2 text-sm text-muted-foreground">Organizaciones que colaboran en la difusión y preservación de nuestras lenguas nativas</p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-8 sm:gap-12 md:gap-16">
          {sponsors.map((sponsor) => (
            <Link 
              key={sponsor.name}
              href={sponsor.url}
              target="_blank"
              className="group flex items-center justify-center transition-transform duration-200 hover:scale-105"
            >
              <Image
                src={sponsor.logo}
                alt={`Logo de ${sponsor.name}`}
                width={140}
                height={60}
                className="group flex items-center justify-center transition-transform duration-200 hover:scale-105"
              />
            </Link>

          ))}
        </div>
      </div>
    </section>
  )
}