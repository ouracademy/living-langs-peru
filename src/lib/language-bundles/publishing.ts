import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  type AdminRead,
  type PublishError,
  publishErrorFor,
} from "../language-packs/publishing.ts";
import { parseBundle } from "./schema.ts";
import type { LanguageBundle } from "./types.ts";

/**
 * The /admin/lenguas side of the bundle library (spec gestor-lenguas §5):
 * never cached, always the database as it is now. The public read stays in
 * `library.ts`, cached and throwing on errors; here an error is a value the
 * admin page shows.
 */

/** A published version, current or from the history. */
export type BundleVersionEntry = {
  version: number;
  note: string;
  publishedAt: string;
  bundle: LanguageBundle;
};

export type BundleVersionSummary = Omit<BundleVersionEntry, "bundle">;

export type { AdminRead, PublishError };

function codeOf(error: unknown): string {
  return (error as { code?: string } | null)?.code ?? "unknown";
}

function failed<T>(what: string, error: unknown): AdminRead<T> {
  // Only the code: a message can quote the row.
  console.error(`language-bundles: ${what} failed (${codeOf(error)})`);
  return { ok: false, error: "unavailable" };
}

type Row = Record<string, unknown>;

function summaryOf(row: Row): BundleVersionSummary | null {
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

function entryOf(row: Row, language: string): BundleVersionEntry | null {
  const summary = summaryOf(row);
  const parsed = parseBundle(row.bundle);
  if (!summary || !parsed.ok || parsed.bundle.language !== language) {
    return null;
  }
  return { ...summary, bundle: parsed.bundle };
}

async function readOne(
  query: PromiseLike<{ data: Row | null; error: unknown }>,
  language: string,
  what: string,
): Promise<AdminRead<BundleVersionEntry | null>> {
  const { data, error } = await query;
  if (error) return failed(what, error);
  if (!data) return { ok: true, value: null };
  const entry = entryOf(data, language);
  return entry
    ? { ok: true, value: entry }
    : failed(what, { code: "malformed" });
}

/** The published bundle with its note, or `null` when there is none yet. */
export function readCurrentBundle(
  client: SupabaseClient,
  language: string,
): Promise<AdminRead<BundleVersionEntry | null>> {
  return readOne(
    client
      .from("language_bundles")
      .select("version, bundle, note, published_at")
      .eq("slug", language)
      .maybeSingle(),
    language,
    "current bundle read",
  );
}

/** One version of the history, bundle included, or `null` if it does not exist. */
export function readBundleVersion(
  client: SupabaseClient,
  language: string,
  version: number,
): Promise<AdminRead<BundleVersionEntry | null>> {
  return readOne(
    client
      .from("bundle_versions")
      .select("version, bundle, note, published_at")
      .eq("slug", language)
      .eq("version", version)
      .maybeSingle(),
    language,
    "bundle version read",
  );
}

/** The history, newest first, without the bundles themselves. */
export async function listBundleVersions(
  client: SupabaseClient,
  language: string,
): Promise<AdminRead<BundleVersionSummary[]>> {
  const { data, error } = await client
    .from("bundle_versions")
    .select("version, note, published_at")
    .eq("slug", language)
    .order("version", { ascending: false });

  if (error) return failed("bundle versions read", error);

  const versions: BundleVersionSummary[] = [];
  for (const row of data ?? []) {
    const summary = summaryOf(row);
    if (!summary) return failed("bundle versions read", { code: "malformed" });
    versions.push(summary);
  }
  return { ok: true, value: versions };
}

export type PublishBundleInput = {
  language: string;
  bundle: LanguageBundle;
  /** The version the editor last saw; 0 = none yet; `null` = publish anyway. */
  expectedVersion: number | null;
  note: string;
};

/** Calls `publish_language_bundle` and returns the new version. */
export async function publishBundle(
  client: SupabaseClient,
  input: PublishBundleInput,
): Promise<{ ok: true; version: number } | { ok: false; error: PublishError }> {
  const { data, error } = await client.rpc("publish_language_bundle", {
    p_slug: input.language,
    p_bundle: input.bundle,
    p_expected_version: input.expectedVersion,
    p_note: input.note,
  });

  if (error) {
    const publishError = publishErrorFor(codeOf(error));
    if (publishError === "unavailable") {
      console.error(`language-bundles: publish failed (${codeOf(error)})`);
    }
    return { ok: false, error: publishError };
  }
  if (typeof data !== "number") {
    console.error("language-bundles: publish answered without a version");
    return { ok: false, error: "unavailable" };
  }
  return { ok: true, version: data };
}
