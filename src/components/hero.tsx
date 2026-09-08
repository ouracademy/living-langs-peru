import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative overflow-hidden min-h-[560px] flex items-center">
      <Image
        src="/ash.jpg"
        alt="Comunidad Asháninka celebrando"
        fill
        priority
        className="object-cover object-center"
      />
      {/* Overlay oscuro para legibilidad del texto */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#241D14]/85 via-[#241D14]/45 to-[#241D14]/10" />
      <div className="max-w-[1180px] mx-auto px-8 relative z-[2] w-full">
        <span className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full font-bold text-sm shadow-[0_2px_0_rgba(36,29,20,0.08)]">
          <span className="w-2 h-2 rounded-full bg-[#E4572E]" />
          Asháninka · Uro
        </span>
        <h1 className="font-bold text-4xl md:text-5xl leading-tight my-4 text-white max-w-[16ch]">
          Aprende, juega y <span className="text-[#F2B705]">celebra</span> las
          lenguas del <span className="text-[#1B98A0]">Perú</span>
        </h1>
        <p className="text-lg text-white/90 max-w-[38ch] mb-6">
          Diccionario, traductor, chatbot, juegos y videos para aprender
          Asháninka y Uro de forma divertida.
        </p>
        <div className="flex gap-3.5 flex-wrap mt-6">
          <Link
            href="#lenguas"
            className="font-bold text-sm px-6.5 py-3.5 rounded-full inline-block bg-[#E4572E] text-white hover:bg-[#C7431C]"
          >
            Elegir una lengua
          </Link>
          <Link
            href="#educacion"
            className="font-bold text-sm px-6.5 py-3.5 rounded-full inline-block border-2 border-white text-white hover:bg-white hover:text-[#241D14]"
          >
            Aprende jugando
          </Link>          
        </div>
      </div>
    </section>
  );
}
