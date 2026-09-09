<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/): `<type>: <subject>`, subject in lowercase and imperative mood.

Allowed types: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`.

A `commit-msg` hook (husky + commitlint) rejects anything else, so malformed messages block the commit. The hook needs Node >= 22 — run `nvm use` first (see `.nvmrc`).
