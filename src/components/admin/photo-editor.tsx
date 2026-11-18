"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";

import { RESIZE_MESSAGES, resizeToJpeg } from "@/components/admin/resize-image";
import {
  type PhotoFieldName,
  photoFieldProblems,
  type PhotoFieldProblems,
  type PhotoFields,
} from "@/lib/admin/photo-fields";
import type { Photo } from "@/lib/peoples";

type PhotoEditorProps = {
  photos: Photo[];
  /** Commit the list was read at; every save sends it back (spec #11). */
  sha: string;
};

/** What every save answers (see route.ts). */
type SaveAnswer = {
  ok?: boolean;
  sha?: string;
  photos?: Photo[];
  message?: string;
  error?: string;
  fields?: PhotoFieldProblems;
};

type Notice =
  | { kind: "none" }
  | { kind: "saved"; message: string }
  | { kind: "failed"; message: string };

const FALLBACK_FAILURE = "No pudimos guardar. Intenta de nuevo.";

/** Same origin: the browser resends the Basic Auth credentials itself. */
async function send(
  method: "POST" | "PATCH" | "DELETE",
  body: FormData | Record<string, string>,
): Promise<{ ok: boolean; answer: SaveAnswer }> {
  try {
    const response = await fetch("/api/admin/fotos", {
      method,
      ...(body instanceof FormData
        ? { body }
        : {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
    });
    const answer: SaveAnswer = await response.json().catch(() => ({}));
    return { ok: response.ok, answer };
  } catch {
    return { ok: false, answer: {} };
  }
}

/**
 * The gallery as it is on the branch, with add, edit, move and remove. Every
 * save answers with the list as committed and the new sha, so the editor sees
 * the change right away; `router.refresh()` then reads the branch again.
 *
 * A photo saved but not yet deployed is not in this deployment's `public/`,
 * so its thumbnail shows «Pendiente de publicar» instead of a broken image.
 */
export function PhotoEditor({ photos, sha }: PhotoEditorProps) {
  const router = useRouter();
  const [gallery, setGallery] = useState({ photos, sha });
  // Adopt the server's list when a refresh brings a newer commit.
  const [readSha, setReadSha] = useState(sha);
  if (sha !== readSha) {
    setReadSha(sha);
    setGallery({ photos, sha });
  }

  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<Notice>({ kind: "none" });
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const items = useRef(new Map<string, HTMLLIElement>());
  const noticeRef = useRef<HTMLDivElement>(null);
  // Where the focus goes once the list re-renders: a button of a photo, or
  // the notice when there is no photo left to land on (`src: null`).
  const [focusRequest, setFocusRequest] = useState<{
    src: string | null;
    action: string;
  } | null>(null);

  useEffect(() => {
    const target = focusRequest;
    if (!target) return;
    if (target.src === null) {
      noticeRef.current?.focus();
      return;
    }
    const item = items.current.get(target.src);
    const wanted = item?.querySelector<HTMLButtonElement>(
      `[data-photo-action="${target.action}"]`,
    );
    // A photo moved to an end: its button in that direction is now disabled.
    const fallback = item?.querySelector<HTMLButtonElement>(
      "[data-photo-action]:not(:disabled)",
    );
    (wanted && !wanted.disabled
      ? wanted
      : (fallback ?? noticeRef.current)
    )?.focus();
  }, [focusRequest]);

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
    const { ok, answer } = await send(method, { ...body, sha: gallery.sha });
    setPending(false);
    if (ok) {
      setNotice({ kind: "saved", message: answer.message ?? "Guardado." });
      adopt(answer);
      return answer;
    }
    setNotice({
      kind: "failed",
      message: answer.message ?? FALLBACK_FAILURE,
    });
    return answer.fields ? answer : null;
  }

  async function move(photo: Photo, direction: "up" | "down") {
    const saved = await change("PATCH", {
      action: "move",
      src: photo.src,
      direction,
    });
    // The focus follows the photo to its new place (AC-E3-7).
    if (saved?.ok) setFocusRequest({ src: photo.src, action: direction });
  }

  async function removePhoto(photo: Photo, index: number) {
    const neighbour =
      gallery.photos[index + 1] ?? gallery.photos[index - 1] ?? null;
    const saved = await change("DELETE", { src: photo.src });
    setConfirming(null);
    if (saved?.ok) {
      setFocusRequest({ src: neighbour?.src ?? null, action: "remove" });
    }
  }

  return (
    <>
      <div
        ref={noticeRef}
        tabIndex={-1}
        className="mt-6 outline-none"
        aria-live="polite"
      >
        {notice.kind === "saved" ? (
          <p role="status" className="text-sm text-[#241D14]">
            {notice.message}
          </p>
        ) : null}
        {notice.kind === "failed" ? (
          <p role="alert" className="text-sm font-bold text-[#C7431C]">
            {notice.message}
          </p>
        ) : null}
      </div>

      {gallery.photos.length === 0 ? (
        <p className="mt-8 text-[#4A4130]">
          La galería no tiene fotos todavía.
        </p>
      ) : (
        <ol className="mt-4 flex flex-col gap-6">
          {gallery.photos.map((photo, index) => {
            const position = index + 1;
            const last = index === gallery.photos.length - 1;
            return (
              <li
                key={photo.src}
                ref={(element) => {
                  if (element) items.current.set(photo.src, element);
                  else items.current.delete(photo.src);
                }}
                className="flex flex-col gap-4 rounded-[20px] bg-white p-4 shadow-[0_2px_0_rgba(36,29,20,0.08)]"
              >
                <div className="flex flex-col gap-4 sm:flex-row">
                  <Thumbnail photo={photo} />
                  <PhotoDetails photo={photo} position={position} />
                </div>
                <div
                  role="group"
                  aria-label={`Acciones de la foto ${position}`}
                  className="flex flex-wrap gap-2"
                >
                  <RowButton
                    action="up"
                    label={`Subir la foto ${position}`}
                    disabled={pending || index === 0}
                    onClick={() => move(photo, "up")}
                  >
                    Subir
                  </RowButton>
                  <RowButton
                    action="down"
                    label={`Bajar la foto ${position}`}
                    disabled={pending || last}
                    onClick={() => move(photo, "down")}
                  >
                    Bajar
                  </RowButton>
                  <RowButton
                    action="edit"
                    label={`Editar los datos de la foto ${position}`}
                    disabled={pending}
                    expanded={editing === photo.src}
                    onClick={() => {
                      setConfirming(null);
                      setEditing(editing === photo.src ? null : photo.src);
                    }}
                  >
                    Editar
                  </RowButton>
                  <RowButton
                    action="remove"
                    label={`Quitar la foto ${position}`}
                    disabled={pending}
                    expanded={confirming === photo.src}
                    onClick={() => {
                      setEditing(null);
                      setConfirming(photo.src);
                    }}
                  >
                    Quitar
                  </RowButton>
                </div>

                {confirming === photo.src ? (
                  <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[#FBEFD2] p-3 text-sm text-[#241D14]">
                    <span>
                      ¿Quitar la foto {position}? También se borra el archivo.
                    </span>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => removePhoto(photo, index)}
                      className="cursor-pointer rounded-full bg-[#C7431C] px-4 py-2 font-bold text-white disabled:cursor-wait disabled:opacity-70"
                    >
                      Sí, quitar
                    </button>
                    <button
                      type="button"
                      // The safe choice gets the focus when the question opens.
                      ref={(element) => element?.focus()}
                      disabled={pending}
                      onClick={() => {
                        setConfirming(null);
                        setFocusRequest({ src: photo.src, action: "remove" });
                      }}
                      className="cursor-pointer rounded-full border-2 border-[#241D14] px-4 py-2 font-bold"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : null}

                {editing === photo.src ? (
                  <EditPhotoForm
                    photo={photo}
                    disabled={pending}
                    onCancel={() => {
                      setEditing(null);
                      setFocusRequest({ src: photo.src, action: "edit" });
                    }}
                    onSave={async (fields) => {
                      const saved = await change("PATCH", {
                        action: "edit",
                        src: photo.src,
                        ...fields,
                      });
                      if (saved?.ok) {
                        setEditing(null);
                        setFocusRequest({ src: photo.src, action: "edit" });
                      }
                      return saved?.fields ?? {};
                    }}
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
      <AddPhotoForm sha={gallery.sha} onSaved={adopt} />
    </>
  );
}

function RowButton({
  action,
  label,
  disabled,
  expanded,
  onClick,
  children,
}: {
  action: string;
  label: string;
  disabled: boolean;
  expanded?: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      data-photo-action={action}
      aria-label={label}
      aria-expanded={expanded}
      disabled={disabled}
      onClick={onClick}
      className="cursor-pointer rounded-full border-2 border-[#241D14] px-4 py-2 text-sm font-bold text-[#241D14] hover:bg-[#FBEFD2] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function PhotoDetails({ photo, position }: { photo: Photo; position: number }) {
  return (
    <div className="flex flex-col gap-1 text-sm text-[#4A4130]">
      <span className="font-bold text-[#241D14]">Foto {position}</span>
      <span>
        <span className="font-bold">Descripción:</span> {photo.alt}
      </span>
      {photo.caption ? (
        <span>
          <span className="font-bold">Pie de foto:</span> {photo.caption}
        </span>
      ) : null}
      <span>
        <span className="font-bold">Crédito:</span> {photo.credit.author} ·{" "}
        <a
          href={photo.credit.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-[#C7431C] underline underline-offset-2 hover:no-underline"
        >
          {photo.credit.license}
        </a>
      </span>
    </div>
  );
}

function Thumbnail({ photo }: { photo: Photo }) {
  const [missing, setMissing] = useState(false);

  if (missing) {
    return (
      <div className="flex h-[120px] w-[160px] shrink-0 items-center justify-center rounded-xl bg-[#FBEFD2] px-3 text-center text-xs text-[#4A4130]">
        Pendiente de publicar
      </div>
    );
  }

  return (
    <Image
      src={photo.src}
      width={photo.width}
      height={photo.height}
      // The description is right next to it as text.
      alt=""
      sizes="160px"
      onError={() => setMissing(true)}
      className="h-[120px] w-[160px] shrink-0 rounded-xl bg-[#FBEFD2] object-cover"
    />
  );
}

const EMPTY_FIELDS: PhotoFields = {
  alt: "",
  caption: "",
  author: "",
  license: "",
  url: "",
};

const FIELD_LABELS: Record<PhotoFieldName, string> = {
  alt: "Descripción (para quien no ve la foto)",
  caption: "Pie de foto (opcional)",
  author: "Autor",
  license: "Licencia",
  url: "Dirección de origen (https://…)",
};

const FIELD_NAMES: PhotoFieldName[] = [
  "alt",
  "caption",
  "author",
  "license",
  "url",
];

/** The five text fields, shared by «Agregar foto» and «Editar». */
function PhotoFieldInputs({
  idPrefix,
  fields,
  problems,
  disabled,
  onChange,
}: {
  idPrefix: string;
  fields: PhotoFields;
  problems: PhotoFieldProblems;
  disabled: boolean;
  onChange: (name: PhotoFieldName, value: string) => void;
}) {
  return (
    <>
      {FIELD_NAMES.map((name) => {
        const inputId = `${idPrefix}-${name}`;
        const errorId = `${inputId}-error`;
        const props = {
          id: inputId,
          name,
          value: fields[name],
          required: name !== "caption",
          "aria-invalid": problems[name] ? true : undefined,
          "aria-describedby": problems[name] ? errorId : undefined,
          disabled,
          className:
            "rounded-xl border-2 border-[#E8DCC4] bg-white px-3 py-2 text-[#241D14] aria-[invalid=true]:border-[#C7431C]",
        };
        return (
          <div key={name} className="flex flex-col gap-1">
            <label htmlFor={inputId} className="font-bold text-[#241D14]">
              {FIELD_LABELS[name]}
            </label>
            {name === "alt" ? (
              <textarea
                {...props}
                rows={3}
                onChange={(event) => onChange(name, event.target.value)}
              />
            ) : (
              <input
                {...props}
                type={name === "url" ? "url" : "text"}
                onChange={(event) => onChange(name, event.target.value)}
              />
            )}
            {problems[name] ? (
              <span id={errorId} className="text-sm text-[#C7431C]">
                {problems[name]}
              </span>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

type Problems = PhotoFieldProblems & { photo?: string };

const ORDER: (PhotoFieldName | "photo")[] = ["photo", ...FIELD_NAMES];

function focusFirstProblem(form: HTMLFormElement | null, found: Problems) {
  const first = ORDER.find((name) => found[name]);
  if (first) form?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
}

function EditPhotoForm({
  photo,
  disabled,
  onSave,
  onCancel,
}: {
  photo: Photo;
  disabled: boolean;
  /** Resolves with the server's field problems (empty when saved). */
  onSave: (fields: PhotoFields) => Promise<PhotoFieldProblems>;
  onCancel: () => void;
}) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [fields, setFields] = useState<PhotoFields>({
    alt: photo.alt,
    caption: photo.caption ?? "",
    author: photo.credit.author,
    license: photo.credit.license,
    url: photo.credit.url,
  });
  const [problems, setProblems] = useState<PhotoFieldProblems>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = photoFieldProblems(fields);
    setProblems(found);
    if (Object.keys(found).length > 0) {
      focusFirstProblem(formRef.current, found);
      return;
    }
    const fromServer = await onSave(fields);
    if (Object.keys(fromServer).length > 0) {
      setProblems(fromServer);
      focusFirstProblem(formRef.current, fromServer);
    }
  }

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={submit}
      aria-label="Editar los datos de la foto"
      className="flex flex-col gap-4 rounded-xl bg-[#FFF7E8] p-4"
    >
      <PhotoFieldInputs
        idPrefix={id}
        fields={fields}
        problems={problems}
        disabled={disabled}
        onChange={(name, value) =>
          setFields((current) => ({ ...current, [name]: value }))
        }
      />
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={disabled}
          className="cursor-pointer rounded-full bg-[#E4572E] px-5 py-2 text-sm font-bold text-white hover:bg-[#C7431C] disabled:cursor-wait disabled:opacity-70"
        >
          Guardar cambios
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onCancel}
          className="cursor-pointer rounded-full border-2 border-[#241D14] px-5 py-2 text-sm font-bold text-[#241D14]"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

type Status =
  | { kind: "idle" }
  | { kind: "working"; step: string }
  | { kind: "saved"; message: string }
  | { kind: "failed"; message: string };

function AddPhotoForm({
  sha,
  onSaved,
}: {
  sha: string;
  onSaved: (answer: SaveAnswer) => void;
}) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [fields, setFields] = useState<PhotoFields>(EMPTY_FIELDS);
  const [file, setFile] = useState<File | null>(null);
  const [problems, setProblems] = useState<Problems>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const busy = status.kind === "working";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    // The same rules the server applies, so the editor sees them before uploading.
    const found: Problems = photoFieldProblems(fields);
    if (!file) found.photo = "Elige una foto.";
    setProblems(found);
    if (Object.keys(found).length > 0 || !file) {
      setStatus({ kind: "idle" });
      focusFirstProblem(formRef.current, found);
      return;
    }

    setStatus({ kind: "working", step: "Reduciendo la foto…" });
    const resized = await resizeToJpeg(file);
    if (!resized.ok) {
      const message = RESIZE_MESSAGES[resized.problem];
      setProblems({ photo: message });
      setStatus({ kind: "failed", message });
      return;
    }

    setStatus({ kind: "working", step: "Guardando…" });
    const body = new FormData();
    for (const [name, value] of Object.entries(fields)) body.set(name, value);
    body.set("sha", sha);
    body.set("photo", resized.photo.blob, "foto.jpg");

    const { ok, answer } = await send("POST", body);

    if (ok) {
      setFields(EMPTY_FIELDS);
      setFile(null);
      formRef.current?.reset();
      setStatus({
        kind: "saved",
        message:
          answer.message ?? "Foto guardada. Se verá en la web en 1–2 minutos.",
      });
      onSaved(answer);
      return;
    }

    if (answer.fields) {
      setProblems(answer.fields);
      focusFirstProblem(formRef.current, answer.fields);
    }
    setStatus({
      kind: "failed",
      message:
        answer.message ?? "No pudimos guardar la foto. Intenta de nuevo.",
    });
  }

  const photoId = `${id}-photo`;

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="mt-12 rounded-[20px] bg-[#FFF7E8] p-6"
    >
      <h2 id={`${id}-title`} className="text-2xl font-bold text-[#241D14]">
        Agregar foto
      </h2>
      <p className="mt-2 text-sm text-[#4A4130]">
        La foto se achica antes de enviarse y pierde sus datos de ubicación.
      </p>
      {/* noValidate: our messages, in Spanish, for every browser. */}
      <form
        ref={formRef}
        noValidate
        onSubmit={submit}
        className="mt-6 flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor={photoId} className="font-bold text-[#241D14]">
            Foto (JPEG, PNG o WebP)
          </label>
          <input
            id={photoId}
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            disabled={busy}
            aria-invalid={problems.photo ? true : undefined}
            aria-describedby={problems.photo ? `${photoId}-error` : undefined}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="cursor-pointer text-sm text-[#241D14]"
          />
          {problems.photo ? (
            <span id={`${photoId}-error`} className="text-sm text-[#C7431C]">
              {problems.photo}
            </span>
          ) : null}
        </div>
        <PhotoFieldInputs
          idPrefix={id}
          fields={fields}
          problems={problems}
          disabled={busy}
          onChange={(name, value) =>
            setFields((current) => ({ ...current, [name]: value }))
          }
        />
        <button
          type="submit"
          disabled={busy}
          className="cursor-pointer self-start rounded-full bg-[#E4572E] px-6 py-3 text-sm font-bold text-white hover:bg-[#C7431C] disabled:cursor-wait disabled:opacity-70"
        >
          Guardar foto
        </button>
        <p role="status" className="text-sm text-[#241D14]">
          {status.kind === "working" ? status.step : null}
          {status.kind === "saved" ? (
            <>
              {status.message}{" "}
              <a
                href="/ashaninka#galeria"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-[#C7431C] underline underline-offset-2"
              >
                Ver la galería
              </a>
            </>
          ) : null}
        </p>
        {status.kind === "failed" ? (
          <p role="alert" className="text-sm font-bold text-[#C7431C]">
            {status.message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
