// Architecture rules, checked by `pnpm check:arch` (and the Stop hook, and CI).
// Existing violations live in .dependency-cruiser-known-violations.json and are
// skipped with --ignore-known; only new ones fail. Never add to that file by
// hand to get a change through: see CONSTRAINTS.md.
const { readdirSync, readFileSync } = require("node:fs");
const { join, relative, sep } = require("node:path");

/**
 * dependency-cruiser selects modules by path, not by content, so the files that
 * start with "use client" are found here when the config loads and turned into
 * a path pattern.
 */
function clientComponentPattern() {
  const root = __dirname;
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        const head = readFileSync(full, "utf8").slice(0, 200).trimStart();
        if (/^["']use client["']/.test(head)) {
          files.push(relative(root, full).split(sep).join("/"));
        }
      }
    }
  };
  walk(join(root, "src"));
  if (files.length === 0) return "^$";
  const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return `^(${files.map(escape).join("|")})$`;
}

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment:
        "Import cycles make load order matter and hide the real dependency. Move the shared piece to its own module.",
      from: {},
      to: { circular: true },
    },
    {
      name: "client-no-server-code",
      severity: "error",
      comment:
        'A "use client" file ships to the browser. It must not import src/server/ or src/db/: pass data down from a Server Component or call a Route Handler.',
      from: { path: clientComponentPattern() },
      to: { path: "^src/(server|db)/" },
    },
    {
      name: "lib-components-not-app",
      severity: "error",
      comment:
        "src/lib/ and src/components/ are used by app/, not the other way round. Move what you need out of src/app/.",
      from: { path: "^src/(lib|components)/" },
      to: { path: "^src/app/" },
    },
  ],
  required: [
    {
      name: "server-modules-import-server-only",
      severity: "error",
      comment:
        'Every module in src/server/ imports "server-only", so a client import fails at build time instead of leaking server code.',
      module: { path: "^src/server/" },
      to: { path: "node_modules/server-only" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "(^|/)(tests|\\.next|\\.claude)/|\\.test\\.tsx?$" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
    },
    reporterOptions: { text: { highlightFocused: true } },
  },
};
