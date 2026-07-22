import Image from "next/image";
import Link from "next/link";
import { Button } from "./ui/button";
import { User } from "lucide-react";

const menuItems = [
  { label: "Lenguas & Recursos", href: "/languages-resources" },
  { label: "Eventos", href: "/events" },
  { label: "Historias", href: "/stories" },
  { label: "Involucrate", href: "/get-involved" },
]

export function HeaderPlataform() {
  return (
    <header className="flex sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Image
            src="/logo.webp"
            alt="Lenguas Peruanas"
            width={100}
            height={100}
            style={{ height: "auto" }}
            className="object-contain"
          />
          <span>Lenguas Peruanas</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {menuItems.map((item) => (
            <Link href={item.href} key={item.label} className="text-base font-medium text-muted-foreground  hover:text-[#044D58] transition-colors">
              {item.label}
            </Link>
          ))}
        </nav>
        <Button variant="ghost" size="icon" className="rounded-full border h-9 w-9">
          <User className="h-4.5 w-4.5 text-muted-foreground" />
          <span className="sr-only font-normal">Usuario</span>
        </Button>
      </div>
    </header>
  )
}