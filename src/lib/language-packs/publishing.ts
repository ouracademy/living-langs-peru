import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { parsePack } from "./schema.ts";
import type { LanguagePack } from "./types.ts";

/**
 * The /admin/juego side of the pack library (spec §6.4, §9.1): never cached,
 * always the database as it is now. The public read path stays in
 * `library.ts`, cached and throwing on errors; here an error is a value the
 * admin page shows.
 */

export type PublishError =
  "version_conflict" | "language_mismatch" | "unavailable";

/** A published version, current or from the history. */
export type PackEntry = {
  version: number;
  note: string;
  publishedAt: string;
  pack: LanguagePack;
};

export type VersionSummary = Omit<PackEntry, "pack">;

export type AdminRead<T> =
  { ok: true; value: T } | { ok: false; error: "unavailable" };

/** Postgres codes raised by `publish_language_pack` (spec §6.2). */
export function publishErrorFor(code: string | undefined): PublishError {
  if (code === "40001") return "version_conflict";
  if (code === "22023") return "language_mismatch";
  return "unavailable";
}

function codeOf(error: unknown): string {
  return (error as { code?: string } | null)?.code ?? "unknown";
}

function failed<T>(what: string, error: unknown): AdminRead<T> {
  // Only the code: a message can quote the row.
  console.error(`language-packs: ${what} failed (${codeOf(error)})`);
  return { ok: false, error: "unavailable" };
}

type Row = Record<string, unknown>;

function summaryOf(row: Row): VersionSummary | null {
  if (
    typeof row.version !== "number" ||
    typeof row.published_at !== "string" ||
    (row.note !== null && typeof row.note !== "string")
  ) {
    return null;
  }
  return {
    version: row.version,
    note: typeof row.note === "string" ? row.note : "",
    publishedAt: row.published_at,
  };
}

function entryOf(row: Row, language: string): PackEntry | null {
  const summary = summaryOf(row);
  const parsed = parsePack(row.pack);
  if (!summary || !parsed.ok || parsed.pack.language.slug !== language) {
    return null;
  }
  return { ...summary, pack: parsed.pack };
}

/** The published pack with its note, or `null` when there is none yet. */
export async function readCurrentPack(
  client: SupabaseClient,
  language: string,
): Promise<AdminRead<PackEntry | null>> {
  const { data, error } = await client
    .from("language_packs")
    .select("version, pack, note, published_at")
    .eq("language", language)
    .maybeSingle();

  if (error) return failed("current pack read", error);
  if (!data) return { ok: true, value: null };

  const entry = entryOf(data, language);
  return entry
    ? { ok: true, value: entry }
    : failed("current pack read", { code: "malformed" });
}

/** The history, newest first, without the packs themselves. */
export async function listVersions(
  client: SupabaseClient,
  language: string,
): Promise<AdminRead<VersionSummary[]>> {
  const { data, error } = await client
    .from("pack_versions")
    .select("version, note, published_at")
    .eq("language", language)
    .order("version", { ascending: false });

  if (error) return failed("versions read", error);

  const versions: VersionSummary[] = [];
  for (const row of data ?? []) {
    const summary = summaryOf(row);
    if (!summary) return failed("versions read", { code: "malformed" });
    versions.push(summary);
  }
  return { ok: true, value: versions };
}

/** One version of the history, pack included, or `null` if it does not exist. */
export async function readVersion(
  client: SupabaseClient,
  language: string,
  version: number,
): Promise<AdminRead<PackEntry | null>> {
  const { data, error } = await client
    .from("pack_versions")
    .select("version, pack, note, published_at")
    .eq("language", language)
    .eq("version", version)
    .maybeSingle();

  if (error) return failed("version read", error);
  if (!data) return { ok: true, value: null };

  const entry = entryOf(data, language);
  return entry
    ? { ok: true, value: entry }
    : failed("version read", { code: "malformed" });
}

export type PublishInput = {
  language: string;
  pack: LanguagePack;
  /** The version the editor last saw; 0 = none yet; `null` = publish anyway. */
  expectedVersion: number | null;
  note: string;
};

/** Calls `publish_language_pack` (spec §6.2) and returns the new version. */
export async function publishPack(
  client: SupabaseClient,
  input: PublishInput,
): Promise<{ ok: true; version: number } | { ok: false; error: PublishError }> {
  const { data, error } = await client.rpc("publish_language_pack", {
    p_language: input.language,
    p_pack: input.pack,
    p_expected_version: input.expectedVersion,
    p_note: input.note,
  });

  if (error) {
    const publishError = publishErrorFor(codeOf(error));
    if (publishError === "unavailable") {
      console.error(`language-packs: publish failed (${codeOf(error)})`);
    }
    return { ok: false, error: publishError };
  }
  if (typeof data !== "number") {
    console.error("language-packs: publish answered without a version");
    return { ok: false, error: "unavailable" };
  }
  return { ok: true, version: data };
}

/**
 * Public URL of the project's `audio` bucket, which `validatePack` needs to
 * tell an audio of ours from any other URL. `null` without SUPABASE_URL.
 */
export function audioBaseUrlFrom(
  env: Readonly<Record<string, string | undefined>>,
): string | null {
  const url = env.SUPABASE_URL?.trim();
  if (!url) return null;
  return `${url.replace(/\/+$/, "")}/storage/v1/object/public/audio/`;
}
