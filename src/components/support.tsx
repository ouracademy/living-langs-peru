import { SupportRequestDialog } from "./support-request-dialog";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Heart, NotebookPen, type LucideIcon } from "lucide-react";
import type { RequestRole } from "@/lib/requests/schema";

const options: {
  title: string;
  description: string;
  buttonText: string;
  role: RequestRole;
  dialogDescription: string;
  icon: LucideIcon;
  color: string;
}[] = [
  {
    title: "Registrarse como editor",
    description: "Ayúdanos a traducir y validar la información.",
    buttonText: "Crear cuenta",
    role: "editor",
    dialogDescription:
      "Déjanos tus datos y te contactaremos para sumarte al equipo de editores.",
    icon: NotebookPen,
    color: "bg-[#E4572E]",
  },
  {
    title: "Donar",
    description: "Ayúdanos a mantener la plataforma viva.",
    buttonText: "Donar",
    role: "donador",
    dialogDescription:
      "Déjanos tus datos y te contactaremos para conversar sobre tu aporte.",
    icon: Heart,
    color: "bg-[#6A3E8C]",
  },
];

export function Support() {
  return (
    <section id="apoyanos" className="py-20">
      <div className="mx-auto max-w-[1180px] px-8">
        <div className="mx-auto mb-11 max-w-[56ch] text-center">
          <span className="mb-3.5 inline-block rounded-full bg-[#6A3E8C] px-4 py-1.5 text-sm font-bold text-white">
            ¿Quieres apoyarnos?
          </span>
          <h2 className="text-3xl font-bold">
            Súmate de la forma que prefieras
          </h2>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-5.5 text-left md:grid-cols-2">
          {options.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.title}
                className="flex flex-col justify-between transition-shadow hover:shadow-lg"
              >
                <CardHeader>
                  <div
                    className={`flex h-12 w-12 items-center justify-center ${item.color} rounded-2xl`}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle
                    style={{ fontFamily: "'Baloo 2', sans-serif" }}
                    className="mb-2 text-lg font-bold"
                  >
                    {item.title}
                  </CardTitle>
                  <CardDescription className="pt-2">
                    {item.description}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="border-none bg-transparent pt-4 font-bold">
                  <SupportRequestDialog
                    role={item.role}
                    triggerLabel={item.buttonText}
                    title={item.title}
                    description={item.dialogDescription}
                  />
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
