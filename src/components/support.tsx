import Link from "next/link";
import { Button } from "./ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Heart, HeartHandshake, PenTool } from "lucide-react";

const options = [
  {
    title: "Registrarse como editor",
    description:
      "Ayúdanos a traducir y validar la información.",
    buttonText: "Crear cuenta",
    href: "/registro-editor",
    icon: PenTool,
    color: "bg-[#E4572E]",
  },
  {
    title: "Voluntarios",
    description:
      "Sumate a nuestro equipo del proyecto.",
    buttonText: "Unirme",
    href: "/voluntarios",
    icon: HeartHandshake,
    color:"bg-[#1B98A0]",
  },
  {
    title: "Donar",
    description:
      "Ayúdanos a mantener la plataforma viva.",
    buttonText: "Donar",
    href: "/donar",
    icon: Heart,
    color: "bg-[#6A3E8C]",
  },
];

export function Support() {
  return (
    <>
      <section id="apoyanos" className="py-20">
        <div className="max-w-[1180px] mx-auto px-8">
          <div className="max-w-[56ch] mx-auto mb-11 text-center">
            <span className="font-['Baloo_2',sans-serif] inline-block bg-[#6A3E8C] text-white font-bold text-sm px-4 py-1.5 rounded-full mb-3.5">
              ¿Quieres apoyarnos?
            </span>
            <h2 className="font-['Baloo_2',sans-serif] font-bold text-3xl">
              Súmate de la forma que prefieras
            </h2>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3 text-left">
            {options.map((item) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.title}
                  className="flex flex-col justify-between transition-shadow hover:shadow-lg"
                >
                  <CardHeader>
                    <div className={`flex h-12 w-12 items-center justify-center ${item.color} rounded-2xl mx-auto`}>                        
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold text-lg mb-2 text-center">{item.title}</CardTitle>
                    <CardDescription className="pt-2 text-center font-['Mulish',sans-serif]">
                      {item.description}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="pt-4 justify-center font-bold">
                    <Button className="font-['Baloo_2',sans-serif]">
                      <Link href={item.href}>{item.buttonText}</Link>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
          {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-5.5">
            {[
              {
                icon: "✎",
                color: "bg-[#E4572E]",
                title: "Registrarse como editor",
                text: "Ayúdanos a traducir y validar información.",
                cta: "Crear cuenta",
              },
              {
                icon: "♥",
                color: "bg-[#1B98A0]",
                title: "Voluntarios",
                text: "Súmate a nuestro equipo del proyecto.",
                cta: "Unirme",
              },
              {
                icon: "✦",
                color: "bg-[#6A3E8C]",
                title: "Donar",
                text: "Ayúdanos a mantener la plataforma viva.",
                cta: "Donar",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-[22px] p-7 text-center"
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl mb-3.5 mx-auto text-white ${item.color}`}
                >
                  {item.icon}
                </div>
                <h3 className="font-['Baloo_2',sans-serif] font-bold text-lg mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-[#4A4130] mb-4">{item.text}</p>
                <a
                  href="#"
                  className="inline-block bg-[#241D14] text-white font-bold px-5 py-2.5 rounded-full no-underline font-['Baloo_2',sans-serif] text-sm"
                >
                  {item.cta}
                </a>
              </div>
            ))}
          </div> */}
        </div>
      </section>
      
      {/* <section className="bg-background px-6 py-20">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="text-3xl tracking-tight text-foreground">
            ¿Quieres apoyarnos?
          </h2>
          <p className="mt-3 text-muted-foreground text-lg">
            Existen diversas formas de apoyar este proyecto de lengua nativa
          </p>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3 text-left">
            {options.map((item) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.title}
                  className="flex flex-col justify-between transition-shadow hover:shadow-lg"
                >
                  <CardHeader>
                    <div className="mb-3 flex h-12 w-12 items-center justify-center bg-primary/10 rounded-lg">
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl">{item.title}</CardTitle>
                    <CardDescription className="pt-2">
                      {item.description}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="pt-4">
                    <Button className="w-full">
                      <Link href={item.href}>{item.buttonText}</Link>
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
