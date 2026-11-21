import Link from "next/link";

/**
 * «Not available» with a way out (AC-SP4-8). No hooks, so both the server page
 * and the client error boundary can render it.
 */
export function GameUnavailable() {
  return (
    <div className="mt-6 max-w-[60ch] text-[#4A4130]">
      <p>
        Saltapalabras no está disponible en este momento. Vuelve a intentarlo
        más tarde.
      </p>
      <p className="mt-4">
        Mientras tanto, puedes practicar con{" "}
        <Link
          href="/juegos/completar-palabras/ashaninka"
          className="font-bold text-[#C7431C] underline underline-offset-2"
        >
          Completar palabras
        </Link>
        .
      </p>
    </div>
  );
}
