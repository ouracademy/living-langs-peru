import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Photo } from "@/lib/peoples";

export const SUPABASE_URL = "https://proyecto-prueba.supabase.co";
export const SECRET_KEY = "sb_secret_clave-de-prueba";
export const PUBLIC_BASE = `${SUPABASE_URL}/storage/v1/object/public/gallery`;

export const repoPhotos: Photo[] = JSON.parse(
  readFileSync(join(process.cwd(), "src/data/peoples/ashaninka.json"), "utf8"),
).photos;

export const credentials = `Basic ${Buffer.from("editora:clave-de-prueba").toString("base64")}`;

export function stubAdminEnv(vi: {
  stubEnv: (name: string, value: string) => unknown;
}) {
  vi.stubEnv("ADMIN_USER", "editora");
  vi.stubEnv("ADMIN_PASSWORD", "clave-de-prueba");
  vi.stubEnv("SUPABASE_URL", SUPABASE_URL);
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", SECRET_KEY);
}

type Failure = { code: string; message?: string };

export type FakeGalleryOptions = {
  row?: { version: number; photos: unknown } | null;
  readError?: Failure;
  saveError?: Failure;
  uploadError?: Failure;
  removeError?: Failure;
};

/**
 * The parts of supabase-js the gallery uses, with the same answers as
 * save_gallery (docs/edicion-fotos-schema.sql): `from("galleries")` read,
 * `rpc("save_gallery")` with its version check, and the bucket's upload and
 * remove. Records every save, upload and removal.
 */
export function fakeGallerySupabase(options: FakeGalleryOptions = {}) {
  let row = options.row ?? null;
  const reads: { table: string; filters: [string, unknown][] }[] = [];
  const saves: Record<string, unknown>[] = [];
  const uploads: {
    bucket: string;
    path: string;
    bytes: Uint8Array;
    options: unknown;
  }[] = [];
  const removals: { bucket: string; paths: string[] }[] = [];

  const client = {
    from(table: string) {
      const asked = { table, filters: [] as [string, unknown][] };
      reads.push(asked);
      const query = {
        select: () => query,
        eq(column: string, value: unknown) {
          asked.filters.push([column, value]);
          return query;
        },
        maybeSingle: async () =>
          options.readError
            ? { data: null, error: options.readError }
            : { data: row ? { ...row } : null, error: null },
      };
      return query;
    },
    async rpc(name: string, args: Record<string, unknown>) {
      saves.push({ name, ...args });
      if (options.saveError) return { data: null, error: options.saveError };
      const current = row?.version ?? 0;
      if (args.p_expected_version !== current) {
        return { data: null, error: { code: "40001", message: "conflict" } };
      }
      row = { version: current + 1, photos: args.p_photos };
      return { data: row.version, error: null };
    },
    storage: {
      from(bucket: string) {
        return {
          async upload(
            path: string,
            bytes: Uint8Array,
            uploadOptions: unknown,
          ) {
            uploads.push({ bucket, path, bytes, options: uploadOptions });
            return options.uploadError
              ? { data: null, error: options.uploadError }
              : { data: { path }, error: null };
          },
          async remove(paths: string[]) {
            removals.push({ bucket, paths });
            return options.removeError
              ? { data: null, error: options.removeError }
              : { data: paths.map((name) => ({ name })), error: null };
          },
        };
      },
    },
  } as unknown as SupabaseClient;

  return {
    client,
    reads,
    saves,
    uploads,
    removals,
    stored: () => row,
  };
}
