import Link from "next/link";
import { BookOpen, FolderOpen, Gamepad2 } from "lucide-react";

type EducationLink = { text: string; href: string };

const educationI: {
  title: string;
  links: EducationLink[];
  bgColor: string;
  icon: typeof BookOpen;
}[] = [
  {
    title: "Tutoriales",
    // Placeholder: /tutoriales does not exist yet, and a dead link is better
    // than a 404.
    links: [{ text: "Ver tutoriales →", href: "#" }],
    bgColor: "bg-[#6A3E8C]",
    icon: BookOpen,
  },
  {
    title: "Juegos",
    // One link per game. The first keeps its wording: completar-palabras'
    // AC-G4-16 finds it by «Aprende jugando».
    links: [
      {
        text: "Aprende jugando →",
        href: "/juegos/completar-palabras/ashaninka",
      },
      // The library, not a language: it is static and never needs Supabase.
      { text: "Saltapalabras →", href: "/juegos/saltapalabras" },
    ],
    bgColor: "bg-[#E4572E]",
    icon: Gamepad2,
  },
  {
    title: "Materiales y videos",
    // Placeholder, like the one above.
    links: [{ text: "Explorar recursos →", href: "#" }],
    bgColor: "bg-[#1B98A0]",
    icon: FolderOpen,
  },
];

export function HelpEducation() {
  return (
    // The hero links here with #educacion, so the id has to exist.
    <section id="educacion" className="scroll-mt-20 bg-[#FBEFD2] py-20">
      <div className="mx-auto max-w-[1180px] px-8">
        <div className="mx-auto mb-11 max-w-[56ch] text-center">
          <span className="mb-3.5 inline-block rounded-full bg-[#6A3E8C] px-4 py-1.5 text-sm font-bold text-white">
            Centro de educación y ayuda
          </span>
          <h2 className="text-3xl font-bold">
            Aprende de la forma que más te guste
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5.5 md:grid-cols-3">
          {educationI.map((item) => (
            <div
              key={item.title}
              className={`flex min-h-[170px] flex-col justify-between rounded-3xl p-8 text-white ${item.bgColor}`}
            >
              <h3 className="text-2xl font-bold">{item.title}</h3>
              <ul className="flex flex-col gap-2">
                {item.links.map((link) => (
                  <li key={link.text}>
                    <Link
                      href={link.href}
                      className="text-sm font-bold text-white underline"
                    >
                      {link.text}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
