// import Link from "next/link";
// import { Button } from "./ui/button";
// import {
//   Card,
//   CardDescription,
//   CardFooter,
//   CardHeader,
//   CardTitle,
// } from "./ui/card";
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
    bgColor:"bg-[#E4572E]",
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
    <>
      <section className="bg-[#FBEFD2] py-20">
        <div className="max-w-[1180px] mx-auto px-8">
          <div className="max-w-[56ch] mx-auto mb-11 text-center">
            <span className="font-['Mulish',sans-serif] inline-block bg-[#6A3E8C] text-white font-bold text-sm px-4 py-1.5 rounded-full mb-3.5">
              Centro de educación y ayuda
            </span>
            <h2 className="font-['Baloo_2',sans-serif] font-bold text-3xl">
              Aprende de la forma que más te guste
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5.5">
            {educationI.map((item) => (
              <div
                key={item.title}
                className={`rounded-3xl p-8 text-white min-h-[170px] flex flex-col justify-between ${item.bgColor}`} 
              >
                <h3 className="text-2xl font-['Baloo_2',sans-serif] font-bold">
                  {item.title}
                </h3>
                <a href="#" className="font-['Mulish',sans-serif] text-white font-bold underline text-sm">
                  {item.linkText} 
                </a>
              </div>
            ))}

            {/* <div className="rounded-3xl p-8 text-white min-h-[170px] flex flex-col justify-between bg-[#E4572E]">
              <h3 className="text-2xl font-['Baloo_2',sans-serif] font-bold">
                Games
              </h3>
              <a href="#" className="text-white font-bold underline text-sm">
                Aprende jugando →
              </a>
            </div>
            <div className="rounded-3xl p-8 text-white min-h-[170px] flex flex-col justify-between bg-[#1B98A0]">
              <h3 className="text-2xl font-['Baloo_2',sans-serif] font-bold">
                Materiales y video
              </h3>
              <a href="#" className="text-white font-bold underline text-sm">
                Explorar recursos →
              </a>
            </div> */}
          </div>
        </div>
      </section>
      {/* <section className="bg-muted/30 px-6 py-20 border-t">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="text-3xl tracking-tight text-foreground">
            Centro de educación y ayuda
          </h2>
          <p className="mt-3 text-muted-foreground text-lg">
            Recursos, herramientas interactivas y guías
          </p>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {educationI.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title}>
                  <CardHeader>
                    <div className=" mb-3 flex justify-center items-center h-12 w-12 bg-primary/10 rounded-lg">
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl">{item.title}</CardTitle>
                    <CardDescription className="pt-2">
                      {item.description}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="pt-4">
                    <Button className="w-full">
                      <Link href={item.href}>{item.linkText}</Link>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      </section> */}
    </>
  );
}
