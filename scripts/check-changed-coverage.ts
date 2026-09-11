#!/usr/bin/env node
// Coverage of the lines this change touched, not of the whole repo: a number
// the change can actually move. Reads the lcov that `pnpm test:coverage`
// already wrote, so the suite never runs twice.
//
// Usage: node --experimental-strip-types scripts/check-changed-coverage.ts
//          [--base <ref>] [--min <percent>] [--warn]
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

const LCOV = "coverage/lcov.info";
// Only product code counts. Tests, type declarations and data are excluded:
// their coverage number says nothing about whether the change is tested.
const MEASURED = /^src\/.*\.(ts|tsx)$/;
const IGNORED = /\.d\.ts$/;

const argumentOf = (flag: string): string | undefined => {
  const index = process.argv.indexOf(flag);
  return index > -1 ? process.argv[index + 1] : undefined;
};

const minimum = Number(argumentOf("--min") ?? 80);
const warnOnly = process.argv.includes("--warn");

const git = (args: string[]): string | null => {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
};

function resolveBase(): string | null {
  const explicit = argumentOf("--base");
  for (const candidate of explicit ? [explicit] : ["origin/main", "main"]) {
    const mergeBase = git(["merge-base", candidate, "HEAD"])?.trim();
    if (mergeBase) return mergeBase;
  }
  return null;
}

const mergeBase = resolveBase();
if (!mergeBase) {
  console.error("check-changed-coverage: no se pudo resolver el merge base.");
  process.exit(2);
}

if (!existsSync(LCOV)) {
  console.error(
    `check-changed-coverage: falta ${LCOV}. Corre primero 'pnpm test:coverage'.`,
  );
  process.exit(2);
}

// Added line numbers per file, from the unified-0 hunk headers.
const changed = new Map<string, Set<number>>();
let file = "";
for (const line of (
  git(["diff", "--unified=0", "--diff-filter=d", mergeBase, "--"]) ?? ""
).split("\n")) {
  if (line.startsWith("+++ ")) {
    file = line.slice(6);
    continue;
  }
  if (!line.startsWith("@@") || !MEASURED.test(file) || IGNORED.test(file)) {
    continue;
  }
  const hunk = line.match(/\+(\d+)(?:,(\d+))?/);
  if (!hunk) continue;
  const start = Number(hunk[1]);
  const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
  const lines = changed.get(file) ?? new Set<number>();
  for (let offset = 0; offset < count; offset += 1) lines.add(start + offset);
  changed.set(file, lines);
}

if (changed.size === 0) {
  console.log("check-changed-coverage: el cambio no toca código de src/");
  process.exit(0);
}

// lcov: SF:<path> opens a record, DA:<line>,<hits> is one instrumented line.
const hits = new Map<string, Map<number, number>>();
let record = "";
for (const line of readFileSync(LCOV, "utf8").split("\n")) {
  if (line.startsWith("SF:")) {
    record = relative(process.cwd(), resolve(line.slice(3).trim()));
    hits.set(record, new Map());
  } else if (line.startsWith("DA:")) {
    const [lineNumber, count] = line.slice(3).split(",").map(Number);
    hits.get(record)?.set(lineNumber, count);
  }
}

let instrumented = 0;
let covered = 0;
const uncovered: string[] = [];
const unmeasured: string[] = [];

for (const [path, lines] of [...changed].sort()) {
  const fileHits = hits.get(path);
  if (!fileHits) {
    unmeasured.push(path);
    continue;
  }
  const misses: number[] = [];
  for (const line of [...lines].sort((a, b) => a - b)) {
    const count = fileHits.get(line);
    // Lines absent from the lcov record are not instrumentable (blank lines,
    // comments, type-only code). Ignoring them is the standard diff-coverage
    // semantic: a comment should not dilute the number either way.
    if (count === undefined) continue;
    instrumented += 1;
    if (count > 0) covered += 1;
    else misses.push(line);
  }
  if (misses.length > 0) uncovered.push(`${path}: ${misses.join(", ")}`);
}

if (instrumented === 0) {
  console.log(
    "check-changed-coverage: ninguna línea instrumentable en el cambio",
  );
  if (unmeasured.length > 0) {
    console.log(`  sin datos de cobertura: ${unmeasured.join(", ")}`);
  }
  process.exit(0);
}

const percent = (covered / instrumented) * 100;
const verdict = percent >= minimum ? "OK" : "BAJO EL MÍNIMO";
console.log(
  `check-changed-coverage: ${percent.toFixed(1)}% (${covered}/${instrumented} líneas cambiadas) mínimo ${minimum}% - ${verdict}`,
);

for (const path of unmeasured) {
  console.log(`  sin datos de cobertura: ${path}`);
}

if (percent >= minimum) process.exit(0);

console.error("  líneas cambiadas sin cubrir:");
for (const entry of uncovered) console.error(`    ${entry}`);

if (warnOnly) {
  console.error(
    "  (aviso, no bloquea: ver CONSTRAINTS.md, seccion 'Cobertura')",
  );
  process.exit(0);
}
process.exit(1);
