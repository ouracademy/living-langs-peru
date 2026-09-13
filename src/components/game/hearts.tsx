import { Heart } from "lucide-react";

import { HEARTS } from "@/lib/game/constants";

export function Hearts({ left }: { left: number }) {
  return (
    <p className="flex items-center gap-1">
      {/* The count is the accessible fact; the hearts are decoration. */}
      <span className="sr-only">
        Vidas: {left} de {HEARTS}
      </span>
      {Array.from({ length: HEARTS }, (_, index) => (
        <Heart
          key={index}
          aria-hidden="true"
          className={
            index < left
              ? "h-5 w-5 fill-[#E4572E] text-[#E4572E]"
              : "h-5 w-5 text-gray-300"
          }
        />
      ))}
    </p>
  );
}
