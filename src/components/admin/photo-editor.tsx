"use client";

import { useRouter } from "next/navigation";
import { useCallback, useId, useRef, useState } from "react";

import {
  MAX_GALLERY_PHOTOS,
  type PhotoFields,
  withCreditDefaults,
} from "@/lib/admin/photo-fields";
import type { Photo } from "@/lib/peoples";

import { AddPhotoPanel } from "./add-photo-panel";
import { type SaveAnswer, sendToGallery } from "./admin-api";
import { EditorNotice, type Notice } from "./editor-notice";
import { failureOf } from "./gallery-notice";
import { GalleryHeader } from "./gallery-header";
import { PhotoRow, type RowMode } from "./photo-row";
import { useRowFocus } from "./use-row-focus";

type PhotoEditorProps = {
  photos: Photo[];
  /** Commit the list was read at; every save sends it back (spec #11). */
  sha: string;
};

/**
 * The gallery as it is on the branch, with add, edit, move and remove. Every
 * save answers with the list as committed and the new sha, so the editor sees
 * the change right away; `router.refresh()` then reads the branch again.
 */
export function PhotoEditor({ photos, sha }: PhotoEditorProps) {
  const router = useRouter();
  const panelId = useId();
  const [gallery, setGallery] = useState({ photos, sha });
  // Adopt the server's list when a refresh brings a newer commit.
  const [readSha, setReadSha] = useState(sha);
  if (sha !== readSha) {
    setReadSha(sha);
    setGallery({ photos, sha });
  }

  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<Notice>({ kind: "none" });
  const [open, setOpen] = useState<{ src: string; mode: RowMode } | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  // The editor's own copy of photos saved in this visit, until they are live.
  const [previews, setPreviews] = useState<Record<string, string>>({});

  // Keys each «saved» notice, so a new save restarts its publish watch.
  const saves = useRef(0);
  const addRef = useRef<HTMLButtonElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const { requestFocus, registerRow } = useRowFocus(noticeRef);
  const reload = () => router.refresh();

  const releasePreviews = useCallback(() => {
    setPreviews((current) => {
      Object.values(current).forEach((url) => URL.revokeObjectURL(url));
      return {};
    });
  }, []);

  function adopt(answer: SaveAnswer) {
    if (answer.photos && answer.sha) {
      setGallery({ photos: answer.photos, sha: answer.sha });
    }
    router.refresh();
  }

  async function change(
    method: "PATCH" | "DELETE",
    body: Record<string, string>,
  ): Promise<SaveAnswer | null> {
    setPending(true);
    setNotice({ kind: "none" });
    const { ok, answer } = await sendToGallery(method, {
      ...body,
      sha: gallery.sha,
    });
    setPending(false);
    if (ok) {
      const message = answer.message ?? "Guardado.";
      saves.current += 1;
      setNotice({ kind: "saved", id: saves.current, message, src: null });
      adopt(answer);
      return answer;
    }
    setNotice({ kind: "failed", failure: failureOf(answer) });
    return answer.fields ? answer : null;
  }

  async function move(photo: Photo, direction: "up" | "down") {
    const saved = await change("PATCH", {
      action: "move",
      src: photo.src,
      direction,
    });
    // The focus follows the photo to its new place (AC-E3-7).
    if (saved?.ok) requestFocus({ src: photo.src, action: direction });
  }

  async function remove(photo: Photo, index: number) {
    const neighbour =
      gallery.photos[index + 1] ?? gallery.photos[index - 1] ?? null;
    const saved = await change("DELETE", { src: photo.src });
    setOpen(null);
    if (saved?.ok) {
      requestFocus({ src: neighbour?.src ?? null, action: "remove" });
    }
  }

  async function edit(photo: Photo, fields: PhotoFields) {
    const saved = await change("PATCH", {
      action: "edit",
      src: photo.src,
      ...withCreditDefaults(fields),
    });
    if (saved?.ok) {
      setOpen(null);
      requestFocus({ src: photo.src, action: "edit" });
    }
    return saved?.fields ?? {};
  }

  function added(answer: SaveAnswer, previewUrl: string) {
    setPanelOpen(false);
    const photo = answer.photo;
    if (photo) {
      setPreviews((current) => ({ ...current, [photo.src]: previewUrl }));
    } else URL.revokeObjectURL(previewUrl);
    saves.current += 1;
    setNotice({
      kind: "saved",
      id: saves.current,
      message:
        answer.message ?? "Foto guardada. Se verá en la web en 1–2 minutos.",
      src: photo?.src ?? null,
      size: photo ? { width: photo.width, height: photo.height } : undefined,
    });
    requestFocus({ src: null, action: "add" });
    adopt(answer);
  }

  const total = gallery.photos.length;

  return (
    <>
      <GalleryHeader
        count={total}
        max={MAX_GALLERY_PHOTOS}
        panelId={panelId}
        panelOpen={panelOpen}
        addRef={addRef}
        onAdd={() =>
          panelOpen
            ? document.getElementById(panelId)?.querySelector("h2")?.focus()
            : setPanelOpen(true)
        }
      />
      {panelOpen ? (
        <AddPhotoPanel
          id={panelId}
          sha={gallery.sha}
          onSaved={added}
          onReload={reload}
          onClose={() => {
            setPanelOpen(false);
            requestAnimationFrame(() => addRef.current?.focus());
          }}
        />
      ) : null}
      <EditorNotice
        notice={notice}
        ref={noticeRef}
        onReload={reload}
        onPublished={releasePreviews}
      />
      {total === 0 ? (
        <p className="mt-6 rounded-[20px] bg-[#FBEFD2] px-5 py-8 text-center text-[#4A4130]">
          La galería no tiene fotos todavía. Pulsa «Agregar foto» para subir la
          primera.
        </p>
      ) : (
        <ol
          aria-label="Fotos de la galería"
          className="mt-6 flex flex-col gap-4"
        >
          {gallery.photos.map((photo, index) => (
            <PhotoRow
              key={photo.src}
              ref={registerRow(photo.src)}
              photo={photo}
              position={index + 1}
              total={total}
              pending={pending}
              mode={open?.src === photo.src ? open.mode : "view"}
              localPreview={previews[photo.src]}
              onMove={(direction) => move(photo, direction)}
              onModeChange={(mode) =>
                setOpen(mode === "view" ? null : { src: photo.src, mode })
              }
              onSave={(fields) => edit(photo, fields)}
              onRemove={() => remove(photo, index)}
              onDismiss={(action) => {
                setOpen(null);
                requestFocus({ src: photo.src, action });
              }}
            />
          ))}
        </ol>
      )}
    </>
  );
}
