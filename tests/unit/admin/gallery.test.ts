import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  applyAction,
  commitMessageFor,
  newPhotoName,
  serializePeople,
} from "@/lib/admin/gallery";
import type { People, Photo } from "@/lib/peoples";

// Git stores the file with LF; a Windows checkout may have CRLF on disk.
const original = readFileSync(
  join(process.cwd(), "src/data/peoples/ashaninka.json"),
  "utf8",
).replace(/\r\n/g, "\n");

const people = (): People => JSON.parse(original) as People;

const newPhoto: Photo = {
  src: "/peoples/ashaninka/2026-11-18-abc123.jpg",
  width: 2400,
  height: 1600,
  alt: "Tres mujeres asháninka tejen una cushma bajo un techo de palma.",
  credit: {
    author: "Centro de la Mujer Peruana Flora Tristán",
    license: "CC BY-SA 4.0",
    url: "https://commons.wikimedia.org/wiki/File:Ejemplo.jpg",
  },
};

describe("applyAction add", () => {
  it("appends the photo at the end and keeps the rest untouched", () => {
    const before = people();
    const result = applyAction(before, { type: "add", photo: newPhoto });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.people.photos).toHaveLength(before.photos.length + 1);
    expect(result.people.photos.at(-1)).toEqual(newPhoto);
    expect(result.people.photos.slice(0, -1)).toEqual(before.photos);
    // Pure: the input is not mutated.
    expect(before.photos).toHaveLength(JSON.parse(original).photos.length);
  });

  // AC-E3-4: the whole file goes through validatePeople before any commit.
  it("rejects a photo that peoples:check would reject", () => {
    for (const photo of [
      { ...newPhoto, alt: "Foto" },
      { ...newPhoto, credit: { ...newPhoto.credit, license: "" } },
      { ...newPhoto, width: 0 },
    ]) {
      const result = applyAction(people(), { type: "add", photo });
      expect(result).toMatchObject({ ok: false, error: "photo_invalid" });
    }
  });

  it("refuses a 25th photo (spec §6.3)", () => {
    const full = people();
    full.photos = Array.from({ length: 24 }, (_, index) => ({
      ...newPhoto,
      src: `/peoples/ashaninka/foto-${index}.jpg`,
    }));

    expect(applyAction(full, { type: "add", photo: newPhoto })).toMatchObject({
      ok: false,
      error: "gallery_full",
    });
  });

  it("refuses a src that is already in the gallery", () => {
    const before = people();
    const result = applyAction(before, {
      type: "add",
      photo: { ...newPhoto, src: before.photos[0].src },
    });
    expect(result).toMatchObject({ ok: false, error: "photo_invalid" });
  });
});

describe("serializePeople", () => {
  // Decision #14: CI runs format:check on every push, the editor's included.
  it("writes the current file back byte for byte", async () => {
    expect(await serializePeople(people())).toBe(original);
  });

  it("formats an edited file the way Prettier would", async () => {
    const result = applyAction(people(), { type: "add", photo: newPhoto });
    if (!result.ok) throw new Error("expected a valid photo");

    const written = await serializePeople(result.people);
    const { format } = await import("prettier");
    expect(written).toBe(await format(written, { parser: "json" }));
    expect(written.endsWith("}\n")).toBe(true);
  });
});

/** Runs the real commitlint CLI with the repository's config. */
function commitlint(
  message: string,
): Promise<{ code: number; output: string }> {
  const cli = join(process.cwd(), "node_modules/@commitlint/cli/cli.js");
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cli]);
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    child.on("close", (code) => resolve({ code: code ?? 1, output }));
    child.stdin.end(message);
  });
}

describe("commitMessageFor", () => {
  // Commits made through the API never run the commit-msg hook (plan §3.11).
  // Starting the CLI takes seconds under a loaded test run, hence the timeout.
  it("passes the repository's commitlint config for every action", async () => {
    expect(commitMessageFor("add")).toBe(
      "chore: update ashaninka gallery (add photo)",
    );

    const runs = await Promise.all(
      (["add", "edit", "move", "remove"] as const).map((action) =>
        commitlint(commitMessageFor(action)),
      ),
    );
    for (const run of runs) expect(run.code, run.output).toBe(0);
  }, 60_000);
});

describe("newPhotoName", () => {
  it("is the UTC date and the random suffix", () => {
    expect(newPhotoName(new Date("2026-11-18T23:30:00Z"), "abc123")).toBe(
      "2026-11-18-abc123.jpg",
    );
  });

  it.each(["", "ABC123", "abc12", "abc/12", "../../x"])(
    "refuses the suffix «%s»",
    (suffix) => {
      expect(() => newPhotoName(new Date(), suffix)).toThrow(RangeError);
    },
  );
});

describe("applyAction edit", () => {
  const edited = {
    alt: "Un grupo de personas asháninka baila en círculo en una aldea.",
    caption: "Danza en una comunidad asháninka, Junín.",
    credit: {
      author: "Carly Rojas",
      license: "CC BY-SA 2.0",
      url: "https://commons.wikimedia.org/wiki/File:Ash%C3%A1ninka_Dance.jpg",
    },
  };

  // AC-E3-4 for edits: texts and credit change, the file never does.
  it("changes the texts and keeps src, width, height and position", () => {
    const before = people();
    const target = before.photos[1];

    const result = applyAction(before, {
      type: "edit",
      src: target.src,
      ...edited,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.people.photos[1]).toEqual({
      src: target.src,
      width: target.width,
      height: target.height,
      ...edited,
    });
    expect(result.people.photos.filter((_, i) => i !== 1)).toEqual(
      before.photos.filter((_, i) => i !== 1),
    );
  });

  it("drops the caption when it is cleared", () => {
    const before = people();
    const target = before.photos.find((photo) => photo.caption);
    if (!target) throw new Error("fixture needs a photo with caption");

    const result = applyAction(before, {
      type: "edit",
      src: target.src,
      ...edited,
      caption: undefined,
    });

    if (!result.ok) throw new Error("expected a valid edit");
    const after = result.people.photos.find((p) => p.src === target.src);
    expect(after).not.toHaveProperty("caption");
  });

  it("rejects an edit that peoples:check would reject", () => {
    const before = people();
    expect(
      applyAction(before, {
        type: "edit",
        src: before.photos[0].src,
        ...edited,
        alt: "Imagen",
      }),
    ).toMatchObject({ ok: false, error: "photo_invalid" });
  });

  it("answers photo_not_found for a src that is not in the gallery", () => {
    expect(
      applyAction(people(), {
        type: "edit",
        src: "/peoples/ashaninka/no-existe.jpg",
        ...edited,
      }),
    ).toMatchObject({ ok: false, error: "photo_not_found" });
  });
});

describe("applyAction move", () => {
  const srcs = (value: People) => value.photos.map((photo) => photo.src);

  // AC-E3-7
  it("swaps a photo with the one above or below", () => {
    const before = people();
    const order = srcs(before);

    const up = applyAction(before, {
      type: "move",
      src: order[2],
      direction: "up",
    });
    const down = applyAction(before, {
      type: "move",
      src: order[2],
      direction: "down",
    });

    if (!up.ok || !down.ok) throw new Error("expected valid moves");
    expect(srcs(up.people)).toEqual([
      order[0],
      order[2],
      order[1],
      ...order.slice(3),
    ]);
    expect(srcs(down.people)).toEqual([
      ...order.slice(0, 2),
      order[3],
      order[2],
      ...order.slice(4),
    ]);
  });

  it("refuses to move past either end", () => {
    const before = people();
    const order = srcs(before);

    expect(
      applyAction(before, { type: "move", src: order[0], direction: "up" }),
    ).toMatchObject({ ok: false, error: "photo_invalid" });
    expect(
      applyAction(before, {
        type: "move",
        src: order.at(-1) ?? "",
        direction: "down",
      }),
    ).toMatchObject({ ok: false, error: "photo_invalid" });
  });

  it("answers photo_not_found for an unknown src", () => {
    expect(
      applyAction(people(), {
        type: "move",
        src: "/peoples/ashaninka/no-existe.jpg",
        direction: "up",
      }),
    ).toMatchObject({ ok: false, error: "photo_not_found" });
  });
});

describe("applyAction remove", () => {
  // AC-E3-6: the entry goes, and the caller learns which file to delete.
  it("removes the entry and names the file to delete", () => {
    const before = people();
    const target = before.photos[3];

    const result = applyAction(before, { type: "remove", src: target.src });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.people.photos).toHaveLength(before.photos.length - 1);
    expect(result.people.photos.some((p) => p.src === target.src)).toBe(false);
    expect(result.deletedFile).toBe(`public${target.src}`);
  });

  it("never names a file outside the gallery folder", () => {
    const before = people();
    before.photos[0] = { ...before.photos[0], src: "/../../package.json" };

    const result = applyAction(before, {
      type: "remove",
      src: "/../../package.json",
    });

    expect(result).toMatchObject({ ok: false, error: "photo_invalid" });
  });

  it("answers photo_not_found for an unknown src", () => {
    expect(
      applyAction(people(), {
        type: "remove",
        src: "/peoples/ashaninka/no-existe.jpg",
      }),
    ).toMatchObject({ ok: false, error: "photo_not_found" });
  });
});

describe("commitMessageFor every action", () => {
  it.each([
    ["edit", "chore: update ashaninka gallery (edit photo)"],
    ["move", "chore: update ashaninka gallery (move photo)"],
    ["remove", "chore: update ashaninka gallery (remove photo)"],
  ] as const)("%s", (action, message) => {
    expect(commitMessageFor(action)).toBe(message);
  });
});
