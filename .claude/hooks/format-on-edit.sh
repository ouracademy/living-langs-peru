#!/usr/bin/env bash
# PostToolUse hook: runs Prettier (and ESLint --fix for JS/TS) on whatever
# file Edit/Write just touched. Reads the hook payload from stdin.
set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-.}"

file_path="$(node -e '
let data = "";
process.stdin.on("data", (c) => (data += c));
process.stdin.on("end", () => {
  try {
    const json = JSON.parse(data);
    const fp = json.tool_input?.file_path ?? json.tool_input?.path ?? "";
    process.stdout.write(fp);
  } catch {
    process.stdout.write("");
  }
});
')"

if [ -z "$file_path" ] || [ ! -f "$file_path" ]; then
  exit 0
fi

case "$file_path" in
  *.ts | *.tsx | *.js | *.jsx | *.mjs | *.cjs | *.json | *.css | *.md)
    pnpm exec prettier --write "$file_path" >/dev/null 2>&1 || true
    ;;
  *)
    exit 0
    ;;
esac

case "$file_path" in
  *.ts | *.tsx | *.js | *.jsx | *.mjs | *.cjs)
    pnpm exec eslint --fix "$file_path" >/dev/null 2>&1 || true
    ;;
esac

exit 0
