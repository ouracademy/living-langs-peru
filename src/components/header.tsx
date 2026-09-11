"use client";

import Image from "next/image";
import Link from "next/link";
import { Button, buttonVariants } from "./ui/button";
import { Menu, User } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import React from "react";
import { cn } from "@/lib/utils";

const menuItems = [
  { label: "Recursos", href: "/languages-resources" },
  { label: "Aprende", href: "/events" },
  { label: "Historias", href: "/stories" },
  // { label: "Involucrate", href: "/get-involved" },
];

export function HeaderPlataform() {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <header className="sticky top-0 z-50 bg-[#FFF7E8]">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2.5">
          <svg width="30" height="30" viewBox="0 0 30 30">
            <circle cx="15" cy="15" r="8" fill="#E4572E" />
            <circle
              cx="15"
              cy="15"
              r="13"
              stroke="#1B98A0"
              strokeWidth="2"
              fill="none"
            />
          </svg>
          <span className="text-xl font-bold">Lenguas Peruanas</span>
        </div>
        <nav className="hidden list-none gap-2.5 md:flex">
          {menuItems.map((item) => (
            <Link
              href={item.href}
              key={item.label}
              style={{ color: "#241D14" }}
              className="text-muted-foreground rounded-full px-4 py-2.5 text-sm font-semibold hover:bg-[#F2B705]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {/* Usuario y Menu sandwich */}
        <div className="flex items-center gap-2">
          {/*User button */}
          <Link
            href="#lenguas"
            className="hidden rounded-full bg-[#E4572E] px-5.5 py-2.5 text-sm font-bold text-white no-underline hover:bg-[#C7431C] md:inline-block"
          >
            Elegir lengua
          </Link>
          {/* Menu sandwich */}
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger
                style={{ cursor:"pointer"}}
                className={cn(
                  buttonVariants({ variant: "outline", size: "icon" }),
                )}
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menú</span>
              </SheetTrigger>
              <SheetContent side="left" className="bg-[#fff7e8] [&>button]:cursor-pointer">
                <SheetHeader>
                  <SheetTitle className="text-left text-xl font-bold">
                    Lenguas Peruanas
                  </SheetTitle>
                </SheetHeader>
                <nav className="mt-6 pl-5 flex flex-col gap-4">
                  {menuItems.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className="font-semibold"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
