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
      <div className="max-w-[1180px] mx-auto px-8">
        <div className="max-w-[56ch] mx-auto mb-11 text-center">
          <span className="font-['Mulish',sans-serif] inline-block bg-[#6A3E8C] text-white font-bold text-sm px-4 py-1.5 rounded-full mb-3.5">
            Sponsors
          </span>
          <h2 className="font-['Baloo_2',sans-serif] font-bold text-3xl">
            Organizaciones aliadas
          </h2>
        </div>
        <div className="flex justify-center gap-5 flex-wrap">
          {sponsors.map((sponsor) => (
            <Link
              key={sponsor.name}
              href={sponsor.url}
              target="_blank"
              className="group flex items-center justify-center "
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
          {/* <div className="bg-white px-6.5 py-4 rounded-2xl font-bold text-sm">
              UNMSM
            </div>
            <div className="bg-white px-6.5 py-4 rounded-2xl font-bold text-sm">
              PERÚ — Ministerio de Cultura
            </div> */}
        </div>
      </div>
    </section>
    // <section className="border-t bg-muted/30 px-6 py-16 text-center">
    //   <div className="mx-auto max-w-6xl">
    //     <h2 className="text-xl tracking-tight text-foreground sm:text-3xl">Sponsors</h2>
    //     <p className="mt-2 sm:text-lg text-muted-foreground">Organizaciones que colaboran en la difusión y preservación de nuestras lenguas nativas</p>
    //     <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12 md:gap-16">
    //       {sponsors.map((sponsor) => (
    //         <Link
    //           key={sponsor.name}
    //           href={sponsor.url}
    //           target="_blank"
    //           className="group flex items-center justify-center "
    //         >
    //           <Image
    //             src={sponsor.logo}
    //             alt={`Logo de ${sponsor.name}`}
    //             width={140}
    //             height={60}
    //             className="h-10 w-auto object-contain sm:h-12"
    //           />
    //         </Link>
    //       ))}
    //     </div>
    //   </div>
    // </section>
  );
}
