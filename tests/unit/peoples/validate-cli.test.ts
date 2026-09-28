import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { ashaninka } from "@/lib/peoples";
import type { People } from "@/lib/peoples/types";

const SCRIPT = join(process.cwd(), "scripts/validate-peoples.ts");
const REAL_DATA = join(process.cwd(), "src/data/peoples");
const scratch = mkdtempSync(join(tmpdir(), "peoples-check-"));

afterAll(() => rmSync(scratch, { recursive: true, force: true }));

/** Runs the real script the way `pnpm peoples:check` does, on a given folder. */
function check(dir: string) {
  return spawnSync(
    process.execPath,
    ["--experimental-strip-types", SCRIPT, dir],
    { encoding: "utf8" },
  );
}

let counter = 0;

/** A folder holding one people file, so each case is checked in isolation. */
function folderWith(content: string): string {
  const dir = join(scratch, `case-${counter++}`);

  mkdirSync(dir);
  writeFileSync(join(dir, "ashaninka.json"), content);

  return dir;
}

/** The real data with exactly one thing broken on purpose. */
function broken(mutate: (people: People) => void): string {
  const copy = structuredClone(ashaninka);

  mutate(copy);

  return folderWith(JSON.stringify(copy));
}

// The unit tests exercise `validatePeople`. These exercise the command a
// person or CI actually runs: the exit code, and what it says on the way out.
describe("pnpm peoples:check", () => {
  // AC-M1-8
  it("passes on the real data", () => {
    const result = check(REAL_DATA);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("✓ ashaninka.json");
  });

  // The four fixtures broken on purpose: AC-M1-9 (three) and AC-M1-12 (one).
  it.each([
    [
      "a citation to a source that does not exist",
      (people: People) => {
        people.sections[0].paragraphs[0].sourceIds = ["no-existe"];
      },
      /no-existe/,
    ],
    [
      "a paragraph with no source",
      (people: People) => {
        people.sections[0].paragraphs[0].sourceIds = [];
      },
      /párrafo sin fuente/,
    ],
    [
      "a photo without alt text",
      (people: People) => {
        people.photos[0].alt = "";
      },
      /alt vacío/,
    ],
    [
      "a region the map has no department for",
      (people: People) => {
        people.territory.regions.push("Atlántida");
      },
      /Atlántida/,
    ],
  ])("fails on %s", (_name, mutate, message) => {
    const result = check(broken(mutate));

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(message);
  });

  it("reports every problem in one run, not just the first", () => {
    const result = check(
      broken((people) => {
        people.sections[0].paragraphs[0].sourceIds = ["no-existe"];
        people.territory.regions.push("Atlántida");
      }),
    );
    const count = Number(/(\d+) problema\(s\)/.exec(result.stderr)?.[1]);

    expect(result.status).toBe(1);
    expect(count).toBeGreaterThanOrEqual(2);
    expect(result.stderr).toMatch(/no-existe/);
    expect(result.stderr).toMatch(/Atlántida/);
  });

  it("fails on a file that is not valid JSON", () => {
    const result = check(folderWith("{ esto no es json"));

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/JSON inválido/);
  });

  it("fails when the folder holds no people at all", () => {
    const empty = join(scratch, "empty");

    mkdirSync(empty);

    const result = check(empty);

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/No hay archivos/);
  });
});
