import { imageSize } from "image-size";

import { MAX_PHOTO_BYTES, MAX_PHOTO_SIDE } from "./photo-limits";

export { MAX_PHOTO_BYTES, MAX_PHOTO_SIDE };

/**
 * What the server accepts as a gallery photo (spec §6.3). The browser has
 * already reduced it (decision #6); this does not trust that it did, and it
 * reads the dimensions from the bytes rather than from the form (decision #7).
 */

export type PhotoInspection =
  { ok: true; width: number; height: number } | { ok: false; message: string };

function invalid(message: string): PhotoInspection {
  return { ok: false, message };
}

export function inspectPhoto(bytes: Uint8Array): PhotoInspection {
  if (bytes.length === 0) return invalid("El archivo está vacío.");
  if (bytes.length > MAX_PHOTO_BYTES) {
    return invalid("La foto pesa más de 3 MB.");
  }

  let size: ReturnType<typeof imageSize>;
  try {
    size = imageSize(bytes);
  } catch {
    // image-size throws on anything it cannot recognise.
    return invalid("La foto tiene que ser un archivo JPEG.");
  }

  if (size.type !== "jpg") {
    return invalid("La foto tiene que ser un archivo JPEG.");
  }

  const { width, height } = size;
  if (!width || !height) {
    return invalid("No pudimos leer las medidas de la foto.");
  }
  if (Math.max(width, height) > MAX_PHOTO_SIDE) {
    return invalid(
      `La foto no puede medir más de ${MAX_PHOTO_SIDE} px por lado.`,
    );
  }

  return { ok: true, width, height };
}
