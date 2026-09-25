import { PERU_DEPARTMENTS } from "./peru-departments.ts";
import type { Territory } from "./types.ts";

/** Lowercase, no diacritics, hyphenated — the same shape as a department id. */
function normalise(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const BY_ID = new Set(PERU_DEPARTMENTS.map((department) => department.id));

/**
 * The department ids the map must highlight, derived from the region names in
 * the JSON. The data spells them the way a reader does («Junín»), the map
 * keys them the way a URL does (`junin`), and this is the only place the two
 * are reconciled — so adding a region to the JSON lights it up on the map.
 *
 * Sorted and deduplicated: the caller is painting a set, not a sequence.
 */
export function highlightedRegionIds(territory: Territory): string[] {
  const ids = new Set<string>();

  for (const region of territory.regions) {
    const id = normalise(region);

    if (BY_ID.has(id)) ids.add(id);
  }

  return [...ids].sort();
}

/**
 * Region names with no department to draw them. `highlightedRegionIds` skips
 * them so the map still renders, and `peoples:check` turns this list into a
 * failure so the typo is reported instead of quietly losing a region.
 */
export function unknownRegions(territory: Territory): string[] {
  return territory.regions.filter((region) => !BY_ID.has(normalise(region)));
}
