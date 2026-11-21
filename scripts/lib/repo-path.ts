import { relative, resolve, sep } from "node:path";

/**
 * A path as git prints it: relative to the repo root, with forward slashes.
 * lcov records absolute paths with the platform separator, so on Windows
 * `relative()` alone gives `src\lib\x.ts` and never matches git's `src/lib/x.ts`.
 */
export function toRepoPath(path: string, root: string = process.cwd()): string {
  return relative(root, resolve(root, path)).split(sep).join("/");
}
