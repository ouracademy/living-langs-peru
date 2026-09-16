import ashaninkaJson from "@/data/peoples/ashaninka.json";

import type { People } from "./types";

/**
 * Static import rather than `fs`, so the same code path works in Server
 * Components with no filesystem access at runtime.
 *
 * TypeScript widens string literals when importing JSON, so the shape cannot
 * be checked structurally here. The `peoples:check` script is the guard that
 * keeps the file honest.
 *
 * There is no lookup by slug on purpose: `/ashaninka` is a static route with
 * no dynamic segment, so a people that does not exist is a compile error, not
 * a runtime branch. See spec §5.2.
 */
export const ashaninka = ashaninkaJson as People;
