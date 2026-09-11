#!/usr/bin/env node
// Language policy: identifiers, file names and data keys in English; Spanish
// only where a human reads it (UI copy, error messages, URL segments).
//
// This is a heuristic, not a parser: it flags Spanish terms from a curated
// list when they appear in a declaration, a file name or a JSON key. It will
// not catch every Spanish identifier, and that is fine - it catches the ones
// this domain actually produces (palabra, lengua, traduccion...) at the moment
// they enter the diff, which is when renaming is still cheap.
//
// Usage: node --experimental-strip-types scripts/check-language-policy.ts
//          [--base <ref>] [--all]
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { isExcused, loadExceptions } from "./lib/exceptions.ts";

type Finding = { rule: string; file: string; detail: string };

const SCOPE = /^(src|tests|scripts)\//;
const CODE = /\.(ts|tsx|mts|js|jsx|mjs|cjs)$/;
const DATA = /^src\/data\/.*\.json$/;

// Terms whose English equivalent is what the code should use. Every entry was
// checked against English words that contain it ("autor" was dropped because
// of "autoRotate", "nota" because of "annotation").
const SPANISH =
  /palabra|lengua|diccionario|traduccion|traducción|busqueda|búsqueda|buscar|entrada|fuente|ejemplo|significado|frase|idioma|usuario|nombre|archivo|titulo|título|letra|definicion|definición|cantidad|pagina|página|consulta|etiqueta|resultado/i;

// A name being declared, which is ours to choose. Object properties and
// destructuring are deliberately excluded: `{ lengua: language }` in a route
// handler is Next.js naming the URL segment, and renaming it would break it.
const DECLARATION =
  /\b(?:const|let|var|function|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g;

// File and directory names: kebab-case ASCII. Next.js route groups and dynamic
// segments keep their brackets and parentheses.
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ROUTE_SEGMENT = /^(\[{1,3}\.{0,3}[a-z0-9-]+\]{1,3}|\([a-z0-9-]+\))$/;

const argumentOf = (flag: string): string | undefined => {
  const index = process.argv.indexOf(flag);
  return index > -1 ? process.argv[index + 1] : undefined;
};

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

const scanAll = process.argv.includes("--all");
const exceptions = loadExceptions();
const findings: Finding[] = [];

const flag = (rule: string, file: string, detail: string): void => {
  if (isExcused(exceptions, rule, file)) return;
  findings.push({ rule, file, detail });
};

function resolveBase(): string | null {
  const explicit = argumentOf("--base");
  for (const candidate of explicit ? [explicit] : ["origin/main", "main"]) {
    const mergeBase = git(["merge-base", candidate, "HEAD"])?.trim();
    if (mergeBase) return mergeBase;
  }
  return null;
}

/** Files to inspect: the whole tree with --all, otherwise the diff. */
function targets(): string[] {
  if (scanAll) {
    return (git(["ls-files", "src", "tests", "scripts"]) ?? "")
      .split("\n")
      .filter(Boolean);
  }

  const mergeBase = resolveBase();
  if (!mergeBase) {
    console.error("check-language-policy: no se pudo resolver el merge base.");
    process.exit(2);
  }

  const changed =
    git(["diff", "--name-only", "--diff-filter=ACMR", mergeBase, "--"]) ?? "";
  const untracked = git(["ls-files", "--others", "--exclude-standard"]) ?? "";
  return [...changed.split("\n"), ...untracked.split("\n")].filter((path) =>
    // Same scope as --all: code. Root files like AGENTS.md or CONSTRAINTS.md
    // follow the convention for their kind, not ours.
    SCOPE.test(path),
  );
}

for (const path of targets()) {
  if (!existsSync(path)) continue;

  // 1. File and directory naming.
  for (const segment of path.split("/")) {
    const name = segment.replace(/\.[a-z0-9.]+$/i, "");
    if (name === "" || KEBAB.test(name) || ROUTE_SEGMENT.test(name)) continue;
    flag("kebab-case-filename", path, `«${segment}» no es kebab-case ASCII`);
    break;
  }
  // Route segments are URLs, which are user-facing and therefore Spanish.
  // Everything else in a path names code, so it must be English.
  if (!path.startsWith("src/app/") && SPANISH.test(path.split("/").pop()!)) {
    flag("spanish-filename", path, "nombre de archivo en español");
  }

  if (statSync(path).size > 512_000) continue;
  const source = readFileSync(path, "utf8");

  // 2. Declared names in code.
  if (CODE.test(path)) {
    for (const line of source.split("\n")) {
      for (const [, identifier] of line.matchAll(DECLARATION)) {
        if (SPANISH.test(identifier)) {
          flag(
            "spanish-identifier",
            path,
            `«${identifier}» declarado en español`,
          );
        }
      }
    }
  }

  // 3. Keys in the dictionary data files.
  if (DATA.test(path)) {
    for (const [, key] of source.matchAll(/"([A-Za-z_][\w]*)"\s*:/g)) {
      if (SPANISH.test(key)) {
        flag("spanish-json-key", path, `clave «${key}» en español`);
      }
    }
  }
}

if (findings.length === 0) {
  console.log(
    scanAll
      ? "check-language-policy: limpio (todo el repo)"
      : "check-language-policy: limpio",
  );
  process.exit(0);
}

console.error(`check-language-policy: ${findings.length} hallazgo(s):`);
for (const finding of findings) {
  console.error(`  [${finding.rule}] ${finding.file}: ${finding.detail}`);
}
console.error(
  "\nEl código va en inglés; el español es para el texto que lee la gente " +
    "(copy, mensajes de error, segmentos de URL). Ver CONSTRAINTS.md.",
);
process.exit(1);
