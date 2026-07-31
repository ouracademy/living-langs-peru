import Link from "next/link"
import { Button } from "./ui/button"
import { Card, CardFooter, CardHeader, CardTitle } from "./ui/card"

const educationI = [
  {
    title:"Tutoriales",
    description: "",
    buttonText: "Ver tutoriales",
    href:"/tutoriales",
    icon: "",
  }, 
  {
    title: "Games",
    description: "",
    buttonText: "abc",
    href: "/juegos",
    icon: "",
  }
]


export function HelpEducation () {
    return (
      <section className="bg-muted/30 px-6 py-20 border-t">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="text-3xl tracking-tight text-foreground">Centro de educación y ayuda</h2>
          <p className="mt-3 text-muted-foreground text-lg">Recursos, herramientas interactivas y guías</p>
          <div className="mt-12 grid grid-col-1 gap-8 md:grid-cols-3">
            {educationI.map((item)=> {
              return (
                <Card key={item.title}>
                  <CardHeader>
                    <CardTitle>{item.title}</CardTitle>
                  </CardHeader>
                  <CardFooter>
                    <Button variant="outline" className="w-full">
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