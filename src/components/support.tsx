import Link from "next/link";
import { Button } from "./ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Heart, HeartHandshake, NotebookPen } from "lucide-react";

const options = [
  {
    title: "Registrarse como editor",
    description: "Ayúdanos a traducir y validar la información.",
    buttonText: "Crear cuenta",
    href: "/registro-editor",
    icon: NotebookPen,
    color: "bg-[#E4572E]",
  },
  {
    title: "Voluntarios",
    description: "Sumate a nuestro equipo del proyecto.",
    buttonText: "Unirme",
    href: "/voluntarios",
    icon: HeartHandshake,
    color: "bg-[#1B98A0]",
  },
  {
    title: "Donar",
    description: "Ayúdanos a mantener la plataforma viva.",
    buttonText: "Donar",
    href: "/donar",
    icon: Heart,
    color: "bg-[#6A3E8C]",
  },
];

export function Support() {
  return (
    <section id="apoyanos" className="py-20">
      <div className="max-w-[1180px] mx-auto px-8">
        <div className="max-w-[56ch] mx-auto mb-11 text-center">
          <span className="inline-block bg-[#6A3E8C] text-white font-bold text-sm px-4 py-1.5 rounded-full mb-3.5">
            ¿Quieres apoyarnos?
          </span>
          <h2 className="font-bold text-3xl">
            Súmate de la forma que prefieras
          </h2>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-5.5 md:grid-cols-3 text-left">
          {options.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.title}
                className="flex flex-col justify-between transition-shadow hover:shadow-lg"
              >
                <CardHeader>
                  <div
                    className={`flex h-12 w-12 items-center justify-center ${item.color} rounded-2xl `}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle
                    style={{ fontFamily: "'Baloo 2', sans-serif" }}
                    className="font-bold text-lg mb-2 "
                  >
                    {item.title}
                  </CardTitle>
                  <CardDescription className="pt-2  ">
                    {item.description}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="pt-4 bg-transparent border-none font-bold">
                  <Button className="rounded-full px-5 py-2.5 ">
                    <Link href={item.href}>{item.buttonText}</Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
