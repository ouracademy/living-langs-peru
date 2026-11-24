import Link from "next/link";

type UnavailableGameProps = {
  name: string;
  /**
   * Why there is no game: no published content at all, or content without
   * example sentences, which is what this game is made of.
   */
  reason: "no-content" | "no-examples";
  /** Languages that do have a pool, so this page is not a dead end. */
  playable: { slug: string; name: string }[];
};

export function UnavailableGame({
  name,
  reason,
  playable,
}: UnavailableGameProps) {
  return (
    <>
      <p className="mt-4 max-w-[60ch] text-[#4A4130]">
        {reason === "no-content"
          ? "Todavía no hay contenido publicado para esta lengua."
          : `Todavía no podemos armar el juego en ${name}: necesita oraciones de ejemplo con fuente, y aún no tenemos ninguna.`}
      </p>

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
