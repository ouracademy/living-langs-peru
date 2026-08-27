import type { Metadata } from "next";
import { Baloo_2, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// const baloo2 = Baloo_2({
//   subsets: ['latin'],
//   weight: ['400', '500', '600', '700', '800'], // Añade los pesos que uses
//   variable: '--font-baloo', // Creamos una variable CSS para Tailwind
// })

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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}
