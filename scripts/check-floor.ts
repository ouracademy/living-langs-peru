#!/usr/bin/env node
// Floor guard: diff-scoped enforcement of the floor declared in CONSTRAINTS.md.
// Adapted from the constraint-driven-development skill's reference guard.
//
// Contract: reads the diff between the merge base and the working tree (added
// and removed lines, plus untracked files). Exit 0 clean, 1 floor violation,
// 2 the guard could not run. Tightening the bar is silent, loosening is loud.
//
// Usage: node --experimental-strip-types scripts/check-floor.ts [--base <ref>]
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { isExcused, loadExceptions, today } from "./lib/exceptions.ts";

type Line = { file: string; text: string };
type Finding = { rule: string; file: string; text: string };

const CODE = /\.(ts|tsx|mts|js|jsx|mjs|cjs|py|css)$/;
const TEST = /\.(test|spec)\.[tj]sx?$/;
// The guards spell out the patterns they look for, so scanning them finds
// nothing but themselves.
const GUARD = /^scripts\/check-[a-z-]+\.ts$/;

// A comment that switches off a checker we rely on.
const SUPPRESSIONS =
  /@ts-ignore|@ts-nocheck|@ts-expect-error|eslint-disable|istanbul ignore|[vc]8 ignore|nosemgrep|gitleaks:allow|# *noqa|# *type: *ignore/;
// Work left unfinished behind something that looks finished.
const STUBS =
  /throw new (Error|NotImplementedError)\(\s*["'`][^"'`]*[Nn]ot implemented|catch\s*(\(\s*\w*\s*\))?\s*\{\s*\}|\bTODO\b|\bFIXME\b/;
// A test made easier.
const SKIPS = /\.(skip|todo)\b|\bxit\(|\bxdescribe\(|@pytest\.mark\.skip/;

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
  const flag = process.argv.indexOf("--base");
  const candidates =
    flag > -1 ? [process.argv[flag + 1]] : ["origin/main", "main"];
  for (const candidate of candidates) {
    const mergeBase = git(["merge-base", candidate, "HEAD"])?.trim();
    if (mergeBase) return mergeBase;
  }
  return null;
}

const mergeBase = resolveBase();
if (!mergeBase) {
  console.error(
    "check-floor: no se pudo resolver el merge base (¿el repo no tiene origin/main?).",
  );
  process.exit(2);
}

const added: Line[] = [];
const removed: Line[] = [];

// Tracked changes: committed, staged and unstaged, all against the merge base.
let file = "";
for (const line of (git(["diff", "--unified=0", mergeBase, "--"]) ?? "").split(
  "\n",
)) {
  if (line.startsWith("+++ ")) file = line.slice(6);
  else if (line.startsWith("--- ")) continue;
  else if (line.startsWith("+")) added.push({ file, text: line.slice(1) });
  else if (line.startsWith("-")) removed.push({ file, text: line.slice(1) });
}

// Untracked files: git diff cannot see them, so every line counts as added.
for (const path of (git(["ls-files", "--others", "--exclude-standard"]) ?? "")
  .split("\n")
  .filter(Boolean)) {
  if (!CODE.test(path) && !path.endsWith(".md")) continue;
  if (!existsSync(path) || statSync(path).size > 512_000) continue;
  for (const text of readFileSync(path, "utf8").split("\n")) {
    added.push({ file: path, text });
  }
}

const exceptions = loadExceptions();
const findings: Finding[] = [];
const flag = (rule: string, path: string, text: string): void => {
  if (isExcused(exceptions, rule, path)) return;
  findings.push({ rule, file: path, text: text.trim().slice(0, 120) });
};

for (const { file: path, text } of added) {
  if (CODE.test(path) && !GUARD.test(path)) {
    if (SUPPRESSIONS.test(text)) flag("silenced-checker", path, text);
    if (STUBS.test(text)) flag("unfinished-work", path, text);
    if (TEST.test(path) && SKIPS.test(text)) {
      flag("test-made-easier", path, text);
    }
  }
  if (path.endsWith("CONSTRAINTS.md") && /^\| *E\d+ *\|/.test(text)) {
    flag("new-exception", path, text);
  }
}

// Assertions: per test file, compare how many went out against how many came
// in. Counting instead of flagging every removed line is what separates
// "deleted the check" from "rewrote three expects as one, or one as three".
const assertionCount = (lines: Line[], path: string): number =>
  lines.filter(
    ({ file: candidate, text }) =>
      candidate === path && /\b(expect|assert)\b/.test(text),
  ).length;

for (const path of new Set(
  removed
    .filter(({ file: candidate }) => TEST.test(candidate))
    .map(({ file: candidate }) => candidate),
)) {
  const lost = assertionCount(removed, path) - assertionCount(added, path);
  if (lost > 0) {
    flag("assertion-removed", path, `${lost} aserción(es) menos que antes`);
  }
}

for (const path of (
  git(["diff", "--diff-filter=D", "--name-only", mergeBase, "--"]) ?? ""
)
  .split("\n")
  .filter((name) => TEST.test(name))) {
  flag("test-deleted", path, "archivo de test eliminado");
}

// Numbers that live in package.json instead of CONSTRAINTS.md. Each one has a
// direction: "down" means a smaller value is a weaker bar, "up" means larger.
const WATCHED: { pattern: RegExp; weakens: "up" | "down"; label: string }[] = [
  { pattern: /--max-warnings=(\d+)/, weakens: "up", label: "--max-warnings" },
  {
    pattern: /check-changed-coverage\.ts.*--min (\d+)/,
    weakens: "down",
    label: "--min de cobertura",
  },
];
for (const { pattern, weakens, label } of WATCHED) {
  const before = removed
    .filter(({ file: path }) => path.endsWith("package.json"))
    .map(({ text }) => text.match(pattern)?.[1])
    .find(Boolean);
  const after = added
    .filter(({ file: path }) => path.endsWith("package.json"))
    .map(({ text }) => text.match(pattern)?.[1])
    .find(Boolean);
  if (before === undefined || after === undefined) continue;
  const weaker =
    weakens === "up"
      ? Number(after) > Number(before)
      : Number(after) < Number(before);
  if (weaker) {
    flag(
      "threshold-lowered",
      "package.json",
      `${label}: ${before} -> ${after}`,
    );
  }
}

// A number in CONSTRAINTS.md that went down is a lowered bar.
const numbers = (text: string): number[] =>
  (text.match(/\d+(\.\d+)?/g) ?? []).map(Number);
const rowKey = (text: string): string => text.split(/[|:]/)[0];
const addedConstraints = added.filter(({ file: path }) =>
  path.endsWith("CONSTRAINTS.md"),
);
for (const before of removed.filter(({ file: path }) =>
  path.endsWith("CONSTRAINTS.md"),
)) {
  const after = addedConstraints.find(
    (line) => rowKey(line.text) === rowKey(before.text),
  );
  if (!after) continue;
  const old = numbers(before.text);
  const now = numbers(after.text);
  if (
    now.some((value, index) => old[index] !== undefined && value < old[index])
  ) {
    flag("threshold-lowered", before.file, `${before.text} -> ${after.text}`);
  }
}

// An exception whose date has passed stops excusing anything, and says so.
for (const exception of exceptions) {
  if (exception.expires < today()) {
    findings.push({
      rule: "exception-expired",
      file: "CONSTRAINTS.md",
      text: `${exception.id} (${exception.rule} en ${exception.path}) venció el ${exception.expires}`,
    });
  }
}

if (findings.length === 0) {
  console.log("check-floor: limpio");
  process.exit(0);
}

console.error(`check-floor: ${findings.length} violación(es) del piso:`);
for (const finding of findings) {
  console.error(`  [${finding.rule}] ${finding.file}: ${finding.text}`);
}
console.error(
  "\nCada una baja el nivel. Arregla el código, o abre una excepción con " +
    "dueño y fecha en CONSTRAINTS.md.",
);
process.exit(1);
