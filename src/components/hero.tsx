import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative flex min-h-[560px] items-center overflow-hidden">
      <Image
        src="/ash.jpg"
        alt="Comunidad Asháninka celebrando"
        fill
        priority
        className="object-cover object-center"
      />
      {/* Overlay oscuro para legibilidad del texto */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#241D14]/85 via-[#241D14]/45 to-[#241D14]/10" />
      <div className="relative z-[2] mx-auto w-full max-w-[1180px] px-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold shadow-[0_2px_0_rgba(36,29,20,0.08)]">
          <span className="h-2 w-2 rounded-full bg-[#E4572E]" />
          Asháninka · Uro
        </span>
        <h1 className="my-4 max-w-[16ch] text-4xl leading-tight font-bold text-white md:text-5xl">
          Aprende, juega y <span className="text-[#F2B705]">celebra</span> las
          lenguas del <span className="text-[#1B98A0]">Perú</span>
        </h1>
        <p className="mb-6 max-w-[38ch] text-lg text-white/90">
          Diccionario, traductor, chatbot, juegos y videos para aprender
          Asháninka y Uro de forma divertida.
        </p>
        <div className="mt-6 flex flex-wrap gap-3.5">
          <Link
            href="#lenguas"
            className="inline-block rounded-full bg-[#E4572E] px-6.5 py-3.5 text-sm font-bold text-white hover:bg-[#C7431C]"
          >
            Elegir una lengua
          </Link>
          <Link
            href="#educacion"
            className="inline-block rounded-full border-2 border-white px-6.5 py-3.5 text-sm font-bold text-white hover:bg-white hover:text-[#241D14]"
          >
            Aprende jugando
          </Link>
        </div>
      </div>
    </section>
  );
}
