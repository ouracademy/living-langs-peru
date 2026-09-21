import Link from "next/link";
import { BookOpen, FolderOpen, Gamepad2 } from "lucide-react";

const educationI = [
  {
    title: "Tutoriales",
    description: "",
    linkText: "Ver tutoriales →",
    // Placeholder: /tutoriales does not exist yet, and a dead link is better
    // than a 404.
    href: "#",
    bgColor: "bg-[#6A3E8C]",
    icon: BookOpen,
  },
  {
    title: "Juegos",
    description: "",
    linkText: "Aprende jugando →",
    href: "/juegos/completar-palabras/ashaninka",
    bgColor: "bg-[#E4572E]",
    icon: Gamepad2,
  },
  {
    title: "Materiales y videos",
    description: "",
    linkText: "Explorar recursos →",
    // Placeholder, like the one above.
    href: "#",
    bgColor: "bg-[#1B98A0]",
    icon: FolderOpen,
  },
];

export function HelpEducation() {
  return (
    // The hero links here with #educacion, so the id has to exist.
    <section id="education" className="bg-[#FBEFD2] py-20 scroll-mt-20">
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
              <Link
                href={item.href}
                className="text-sm font-bold text-white underline"
              >
                {item.linkText}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
