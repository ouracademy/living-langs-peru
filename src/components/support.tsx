
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
    href: "/donar",
    icon: Heart,
  },
];

export function Support() {
  return (
    <section className="bg-background px-6 py-20">
      <div className="mx-auto max-w-6xl text-center">
        <h2 className="text-3xl tracking-tight text-foreground">¿Quieres apoyarnos?</h2>
        <p className="mt-3 text-muted-foreground text-lg">abcd</p>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3 text-left">
          {options.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="flex flex-col justify-between transition-shadow hover:shadow-lg">
                <CardHeader>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center bg-primary/10 rounded-lg">
                    <Icon className="h-6 w-6"/>
                  </div>
                  <CardTitle className="text-xl">{item.title}</CardTitle>
                  <CardDescription className="pt-2">{item.description}</CardDescription>
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
    </section>
  );
}
