
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
    description: "",
    buttonText: "Crear cuenta de editor",
    href: "/registro-editor",
    icon: PenTool,
  },
  {
    title: "Voluntarios",
    description: "",
    buttonText: "Unirme como voluntario",
    href: "/voluntarios",
    icon: HeartHandshake,
  },
  {
    title: "Donar",
    description: "",
    buttonText: "Donar",
    href: "",
    icon: Heart,
  },
];

export function Support() {
  return (
    <section className="bg-background px-6 py-20">
      <div className="mx-auto max-w-6xl text-center">
        <h2>¿Quieres apoyarnos?</h2>
        <p>abcd</p>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3 text-left">
          {options.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="flex flex-col justify-between">
                <CardHeader>
                  <div>
                    <Icon />
                  </div>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardFooter className="pt-4">
                  <Button>
                    <Link href={item.href} />
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
