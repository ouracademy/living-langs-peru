import { MAX_PHOTO_BYTES, MAX_PHOTO_SIDE } from "@/lib/admin/photo-limits";

/**
 * Reduces a photo in the browser before it is sent (decision #6): longest
 * side ≤ 2400 px, re-encoded as JPEG. Re-encoding through a canvas also drops
 * every metadata segment, GPS included (AC-E3-2).
 *
 * The pure part (accepted types, target size) is unit-tested; the canvas part
 * only runs in a real browser and is covered by the e2e suite.
 */

export const ACCEPTED_INPUT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** A guard against a file the phone could not even decode (raw, panorama…). */
export const MAX_INPUT_BYTES = 40 * 1024 * 1024;

/** Tried in order until the result fits under MAX_PHOTO_BYTES. */
const QUALITIES = [0.85, 0.75, 0.65];

export function isAcceptedType(type: string): boolean {
  return (ACCEPTED_INPUT_TYPES as readonly string[]).includes(type);
}

/** Same proportions, longest side at most `maxSide`; never enlarged. */
export function targetSize(
  width: number,
  height: number,
  maxSide = MAX_PHOTO_SIDE,
): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export type ResizedPhoto = { blob: Blob; width: number; height: number };

export type ResizeProblem = "unsupported_type" | "too_large" | "unreadable";

export const RESIZE_MESSAGES: Record<ResizeProblem, string> = {
  unsupported_type: "La foto tiene que ser JPEG, PNG o WebP.",
  too_large: "La foto es demasiado pesada. Prueba con otra.",
  unreadable: "No pudimos leer la foto. Prueba con otra.",
};

export function inputProblem(file: {
  type: string;
  size: number;
}): ResizeProblem | null {
  if (!isAcceptedType(file.type)) return "unsupported_type";
  if (file.size > MAX_INPUT_BYTES) return "too_large";
  return null;
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob && blob.type === "image/jpeg"
          ? resolve(blob)
          : reject(new Error("toBlob did not produce a JPEG")),
      "image/jpeg",
      quality,
    );
  });
}

export async function resizeToJpeg(
  file: File,
): Promise<
  { ok: true; photo: ResizedPhoto } | { ok: false; problem: ResizeProblem }
> {
  const problem = inputProblem(file);
  if (problem) return { ok: false, problem };

  let bitmap: ImageBitmap;
  try {
    // "from-image" applies the EXIF rotation before the metadata is dropped.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return { ok: false, problem: "unreadable" };
  }

  const size = targetSize(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return { ok: false, problem: "unreadable" };
  }
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();

  try {
    for (const quality of QUALITIES) {
      const blob = await toJpeg(canvas, quality);
      if (blob.size <= MAX_PHOTO_BYTES) {
        return { ok: true, photo: { blob, ...size } };
      }
    }
  } catch {
    return { ok: false, problem: "unreadable" };
  }
  return { ok: false, problem: "too_large" };
}
