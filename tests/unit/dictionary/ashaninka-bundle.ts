import bundleJson from "@/data/bundles/ashaninka.json";
import { bundleToDictionary } from "@/lib/language-bundles/adapters";
import { parseBundle } from "@/lib/language-bundles/schema";

/**
 * The asháninka content the site serves, from its language bundle (spec
 * gestor-lenguas, F4): no alphabet or word is written in code any more, so
 * tests take both from here.
 */
const parsed = parseBundle(bundleJson);
if (!parsed.ok) {
  throw new Error(`The asháninka bundle does not parse: ${parsed.issues[0]}`);
}

export const ashaninkaBundle = parsed.bundle;

/** The dictionary, its cited sources and its alphabet, as the site shows them. */
export const ashaninka = bundleToDictionary(parsed.bundle);

/** The official alphabet, as the bundle carries it. */
export const ASHANINKA_ALPHABET: readonly string[] =
  parsed.bundle.alphabet.graphemes;
