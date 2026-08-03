import Link from "next/link"
import { Button } from "./ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card"
import { BookOpen, FolderOpen, Gamepad2 } from "lucide-react"


const educationI = [
  {
    title:"Tutoriales",
    description: "",
    buttonText: "Ver tutoriales",
    href:"/tutoriales",
    icon: BookOpen,
  }, 
  {
    title: "Games",
    description: "",
    buttonText: "Aprende jugando",
    href: "/juegos",
    icon: Gamepad2,
  },
  {
    title:"Materiales y videos",
    description:"",
    buttonText: "Explorar recursos",
    href:"/materiales",
    icon: FolderOpen,
  }

]

export function HelpEducation () {
    return (
      <section className="bg-muted/30 px-6 py-20 border-t">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="text-3xl tracking-tight text-foreground">Centro de educación y ayuda</h2>
          <p className="mt-3 text-muted-foreground text-lg">Recursos, herramientas interactivas y guías</p>
          
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {educationI.map((item)=> {
              const Icon = item.icon;
              return (
                <Card key={item.title}>
                  <CardHeader>
                    <div className=" mb-3 flex justify-center items-center h-12 w-12 bg-primary/10 rounded-lg">
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
              )
            })}
          </div>
        </div>
      </section>
    )
}