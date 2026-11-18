import type { Metadata } from "next";
import { headers } from "next/headers";

import { PhotoEditor } from "@/components/admin/photo-editor";
import { checkBasicAuth } from "@/lib/admin/basic-auth";
import {
  GALLERY_ERROR_MESSAGES,
  readGallery,
} from "@/lib/admin/gallery-source";
import { readGitHubConfig } from "@/lib/admin/github";

export const metadata: Metadata = {
  title: "Edición de fotos",
  robots: { index: false, follow: false },
};

/**
 * Reads the gallery from GitHub on every request (spec #10). Reading the
 * request headers keeps the route dynamic; the proxy has already asked for the
 * password, and this checks it again rather than trusting the matcher.
 */
export default async function AdminPhotosPage() {
  const authorization = (await headers()).get("authorization");
  if (checkBasicAuth(authorization) !== "ok") {
    return (
      <main className="mx-auto w-full max-w-[960px] flex-1 px-6 py-12">
        <h1 className="text-2xl font-bold text-[#241D14]">
          Acceso restringido
        </h1>
      </main>
    );
  }

  const gallery = await readGallery(readGitHubConfig(), fetch);

  return (
    <main className="mx-auto w-full max-w-[960px] flex-1 px-6 py-12">
      <h1 className="text-3xl font-bold text-[#241D14]">
        Fotos de la galería asháninka
      </h1>
      <p className="mt-3 text-[#4A4130]">
        Los cambios tardan 1–2 minutos en verse en la web. Para salir, cierra el
        navegador.
      </p>
      {gallery.ok ? (
        <PhotoEditor photos={gallery.value.photos} />
      ) : (
        // No form on failure: an empty list would invite overwriting the gallery.
        <p
          role="alert"
          className="mt-8 rounded-xl bg-[#FBEFD2] px-5 py-4 text-[#241D14]"
        >
          No pudimos leer la galería. {GALLERY_ERROR_MESSAGES[gallery.error]}
        </p>
      )}
    </main>
  );
}
