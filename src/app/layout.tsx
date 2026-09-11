import type { Metadata } from "next";

import { Footer } from "@/components/footer";
import { HeaderPlataform } from "@/components/header";
import { Baloo_2, Mulish } from "next/font/google";
import "./globals.css";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

const mulish = Mulish({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mulish",
});

const baloo2 = Baloo_2({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"], // Añade los pesos que uses
  variable: "--font-baloo", // Creamos una variable CSS para Tailwind
});

export const metadata: Metadata = {
  title: {
    default: "Lenguas originarias de Peru",
    template: "%s | Lenguas originarias de Peru",
  },
  description: "Conoce la diversidad lingüística del país",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${baloo2.variable} ${mulish.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <div
          data-site-stripe
          className="h-3 w-full"
          style={{
            background:
              "repeating-linear-gradient(90deg, #E4572E 0 60px, #F2B705 60px 110px, #1B98A0 110px 190px, #6A3E8C 190px 230px)",
          }}
        />
        <HeaderPlataform />
        {children}
        <Footer />
      </body>
    </html>
  );
}
