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
    <>
      <header className="bg-[#FFF7E8] sticky top-0 z-50">
        <div className="max-w-[1180px] mx-auto px-8 flex items-center justify-between py-5">
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
            <span className="font-['Baloo_2',sans-serif] font-bold text-xl">
              Lenguas Peruanas
            </span>
          </div>
          <nav className="hidden md:flex gap-2.5 list-none">
            {menuItems.map((item)=> (
              <Link
                href={item.href}
                key={item.label}
                style={{ color: "#241D14" }}
                className="font-['Mulish',sans-serif] text-sm font-semibold rounded-full px-4 py-2.5 text-muted-foreground  hover:bg-[#F2B705]"
              >
                {item.label}
              </Link>
            ))}
            {/* <li>
              <a
                href="#recursos"
                className="font-['Mulish',sans-serif] text-[#241D14] no-underline font-semibold text-sm px-4 py-2.5 rounded-full hover:bg-[#F2B705]"
              >
                Recursos
              </a>
            </li>
            <li>
              <a
                href="#educacion"
                className="font-['Mulish',sans-serif] text-[#241D14] no-underline font-semibold text-sm px-4 py-2.5 rounded-full hover:bg-[#F2B705]"
              >
                Aprende
              </a>
            </li>
            <li>
              <a
                href="#historias"
                className=" font-['Mulish',sans-serif] text-[#241D14] no-underline font-semibold text-sm px-4 py-2.5 rounded-full hover:bg-[#F2B705]"
              >
                Historias
              </a>
            </li> */}
          </nav>
          <a
            href="#lenguas"
            className=" font-['Baloo_2',sans-serif] font-bold text-sm bg-[#E4572E] text-white px-5.5 py-2.5 rounded-full no-underline hover:bg-[#C7431C]"
          >
            Elegir lengua
          </a>
        </div>
      </header>
      {/* <header className="flex sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur"> */}
        {/* <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center font-bold text-lg">
            <Image
              src="/logo.webp"
              alt="Lenguas Peruanas"
              width={100}
              height={100}
              className="object-contain h-auto w-24"
            />
            <span>Lenguas Peruanas</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {menuItems.map((item) => (
              <Link
                href={item.href}
                key={item.label}
                className="text-base font-medium text-muted-foreground  hover:text-[#044D58] transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav> */}
          {/* Usuario y Menu sandwich */}
          {/* <div className="flex items-center gap-2"> */}
            {/*User button */}
            {/* <Button
              variant="ghost"
              size="icon"
              className="rounded-full border h-9 w-9"
            >
              <User className="h-4.5 w-4.5 text-muted-foreground" />
              <span className="sr-only font-normal">Usuario</span>
            </Button> */}
            {/* Menu sandwich*/}
            {/* <div className="md:hidden">
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger
                  className={cn(
                    buttonVariants({ variant: "outline", size: "icon" }),
                  )}
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Abrir menú</span>
                </SheetTrigger>
                <SheetContent side="left">
                  <SheetHeader>
                    <SheetTitle className="text-left text-lg">
                      Lenguas Peruanas
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="mt-6 pl-5 flex flex-col gap-4">
                    {menuItems.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </nav>
                </SheetContent>
              </Sheet>
            </div> */}
          {/* </div> */}
        {/* </div> */}
      {/* </header> */}
    </>
  );
}
