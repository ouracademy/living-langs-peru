import { describe, expect, it } from "vitest";

import { MAX_NOTE_LENGTH } from "@/lib/language-bundles/bundle-file";
import { readBundlePublishRequest } from "@/lib/language-bundles/publish-request";

import { testBundle, testEntry } from "./fixtures";

const AUDIO = "https://proyecto.supabase.co/storage/v1/object/public/audio/";

function body(overrides: Record<string, unknown> = {}) {
  return {
    bundle: testBundle(),
    expectedVersion: 0,
    note: "Revisado por PRUEBA",
    ...overrides,
  };
}

describe("readBundlePublishRequest", () => {
  it("accepts a valid bundle with a note", () => {
    const read = readBundlePublishRequest(body(), "uro", AUDIO);
    expect(read).toMatchObject({
      ok: true,
      expectedVersion: 0,
      note: "Revisado por PRUEBA",
    });
  });

  it("accepts «publicar igual» (no expected version)", () => {
    const read = readBundlePublishRequest(
      body({ expectedVersion: null }),
      "uro",
    );
    expect(read.ok && read.expectedVersion).toBeNull();
  });

  it("refuses a body of the wrong shape", () => {
    expect(readBundlePublishRequest("nada", "uro").ok).toBe(false);
    const read = readBundlePublishRequest(body({ expectedVersion: -1 }), "uro");
    expect(!read.ok && read.error).toBe("invalid_request");
  });

  it("requires a note, and limits its length", () => {
    const empty = readBundlePublishRequest(body({ note: "   " }), "uro");
    expect(!empty.ok && empty.error).toBe("note_required");

    const long = readBundlePublishRequest(
      body({ note: "x".repeat(MAX_NOTE_LENGTH + 1) }),
      "uro",
    );
    expect(!long.ok && long.error).toBe("note_too_long");
  });

  it("refuses something that is not a bundle, with the problems", () => {
    const read = readBundlePublishRequest(
      body({ bundle: { schema: "otra" } }),
      "uro",
    );
    expect(!read.ok && read.error).toBe("bundle_invalid");
    expect(!read.ok && read.problems?.length).toBeGreaterThan(0);
  });

  it("refuses a bundle with errors, and lists them", () => {
    const broken = testBundle({
      entries: [testEntry({ sourceId: "no-existe" })],
      themes: [],
    });
    const read = readBundlePublishRequest(body({ bundle: broken }), "uro");
    expect(!read.ok && read.error).toBe("bundle_has_errors");
    expect(!read.ok && read.issues?.[0].code).toBe("unknown_source");
  });

  it("refuses a bundle of the other language", () => {
    const read = readBundlePublishRequest(body(), "ashaninka");
    expect(!read.ok && read.error).toBe("bundle_has_errors");
    expect(!read.ok && read.issues?.[0].code).toBe("language_mismatch");
  });
});
