import Link from "next/link";
import { BookOpen, FolderOpen, Gamepad2 } from "lucide-react";

const educationI = [
  {
    title: "Tutoriales",
    description: "",
    linkText: "Ver tutoriales →",
    href: "/tutoriales",
    bgColor: "bg-[#6A3E8C]",
    icon: BookOpen,
  },
  {
    title: "Games",
    description: "",
    linkText: "Aprende jugando →",
    href: "/juegos",
    bgColor: "bg-[#E4572E]",
    icon: Gamepad2,
  },
  {
    title: "Materiales y videos",
    description: "",
    linkText: "Explorar recursos →",
    href: "/materiales",
    bgColor: "bg-[#1B98A0]",
    icon: FolderOpen,
  },
];

export function HelpEducation() {
  return (
    <section className="bg-[#FBEFD2] py-20">
      <div className="max-w-[1180px] mx-auto px-8">
        <div className="max-w-[56ch] mx-auto mb-11 text-center">
          <span className="inline-block bg-[#6A3E8C] text-white font-bold text-sm px-4 py-1.5 rounded-full mb-3.5">
            Centro de educación y ayuda
          </span>
          <h2 className="font-bold text-3xl">
            Aprende de la forma que más te guste
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5.5">
          {educationI.map((item) => (
            <div
              key={item.title}
              className={`rounded-3xl p-8 text-white min-h-[170px] flex flex-col justify-between ${item.bgColor}`}
            >
              <h3 className="text-2xl font-bold">{item.title}</h3>
              <Link href="#" className="text-white font-bold underline text-sm">
                {item.linkText}
              </Link>
            </div>
          ))}          
        </div>
      </div>
    </section>
  );
}
