import Image from "next/image";
import Link from "next/link";

const sponsors = [
  { name: "UNMSM", logo: "/unmsm.png", url: "https://www.unmsm.edu.pe/" },
  {
    name: "Ministerio de cultura",
    logo: "/ministerio-cultura.png",
    url: "https://www.gob.pe/cultura",
  },
];

export function SponsorsSection() {
  return (
    <section className="bg-[#FBEFD2] py-20">
      <div className="mx-auto max-w-[1180px] px-8">
        <div className="mx-auto mb-11 max-w-[56ch] text-center">
          <span className="mb-3.5 inline-block rounded-full bg-[#6A3E8C] px-4 py-1.5 text-sm font-bold text-white">
            Sponsors
          </span>
          <h2 className="text-3xl font-bold">Organizaciones aliadas</h2>
        </div>
        <div className="flex flex-wrap justify-center gap-5">
          {sponsors.map((sponsor) => (
            <Link
              key={sponsor.name}
              href={sponsor.url}
              target="_blank"
              className="group flex items-center justify-center"
            >
              <Image
                src={sponsor.logo}
                alt={`Logo de ${sponsor.name}`}
                width={140}
                height={60}
                className="h-10 w-auto object-contain sm:h-12"
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
