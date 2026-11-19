import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * What must never reach the browser bundle (plan §3.6, AC-SP3-12): the
 * Supabase REST API, the fake's address, and any key name or e2e key value.
 */
export const BUNDLE_LEAK_PATTERNS = [
  "/rest/v1",
  "supabase.co",
  "127.0.0.1:54329",
  "SUPABASE_SERVICE_ROLE_KEY",
  "e2e-not-a-key",
] as const;

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

/** Every `pattern in file` found under `directory`. Empty means clean. */
export function findBundleLeaks(directory: string): string[] {
  return filesUnder(directory).flatMap((file) => {
    const text = readFileSync(file, "utf8");
    return BUNDLE_LEAK_PATTERNS.filter((pattern) => text.includes(pattern)).map(
      (pattern) => `${pattern} in ${file}`,
    );
  });
}
