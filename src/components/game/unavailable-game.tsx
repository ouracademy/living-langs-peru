import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Why a language we know about has no game.
 *
 * Keyed by slug and partial on purpose, the same way `LANGUAGE_CODES` is in
 * the dictionary layer: a language whose reason we have not written gets the
 * general explanation rather than a borrowed one that might not be true.
 */
const REASONS: Record<string, ReactNode> = {
  uro: (
    <>
      No es que no lo hayamos hecho todavía: el uro{" "}
      <strong className="font-bold">
        no tiene hablantes desde la década de 1920
      </strong>{" "}
      y no tiene alfabeto oficial, así que no hay un corpus del que sacar
      oraciones. No ponemos una fecha porque no depende de nosotros, sino de un
      trabajo de recuperación lingüística que recién podría empezar.{" "}
      <Link href="/lenguas/uro" className="underline">
        Lo que sí sabemos del uro
      </Link>
      .
    </>
  ),
};

type UnavailableGameProps = {
  language: string;
  name: string;
  /** Languages that do have a pool, so this page is not a dead end. */
  playable: { slug: string; name: string }[];
};

export function UnavailableGame({
  language,
  name,
  playable,
}: UnavailableGameProps) {
  return (
    <>
      <p className="mt-4 max-w-[60ch] text-[#4A4130]">
        Todavía no podemos armar el juego en {name}: necesita oraciones de
        ejemplo con fuente, y aún no tenemos ninguna.
      </p>

      {REASONS[language] && (
        <p className="mt-4 max-w-[60ch] text-[#4A4130]">{REASONS[language]}</p>
      )}

      {playable.length > 0 && (
        <>
          <h2 className="mt-8 font-bold">
            Lenguas con las que sí se puede jugar
          </h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {playable.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/juegos/completar-palabras/${item.slug}`}
                  className="underline"
                >
                  Completar palabras en {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
