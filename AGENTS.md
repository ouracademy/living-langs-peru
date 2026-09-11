<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


# Coding conventions

Any code should be in english: file names, types, fields, functions, variables, JSON keys, error codes,

# Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/): `<type>: <subject>`, subject in lowercase and imperative mood.

Allowed types: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`.

A `commit-msg` hook (husky + commitlint) rejects anything else, so malformed messages block the commit. The hook needs Node >= 22 — run `nvm use` first (see `.nvmrc`).

# Specs and plans

**Always organize by feature or module. Never write one monolithic `SPEC.md` or `plan.md` at the repo root.**

The feature name is the shared key across all three locations:

| Path                      | Holds                                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------- |
| `specs/<feature>.md`      | What we're building: objective, contracts, acceptance criteria, boundaries. Written before any code. |
| `tasks/<feature>/plan.md` | Phases, dependency graph, implementation decisions, risks, checkpoints.                              |
| `tasks/<feature>/todo.md` | The executable checklist.                                                                            |
| `docs/`                   | Results and reference: research output, ADRs, operational notes.                                     |

Example: `specs/diccionario.md` + `tasks/diccionario/`.

## Rules

- **One spec per feature, not per module.** A feature built from several independently testable
  capabilities declares its capability map (module ids, dependency direction, build order) _inside_
  its own spec. Splitting one coherent design across files makes the cross-references rot.
- **Plans slice vertically.** A phase ends with something that works end to end, not with a finished
  horizontal layer. Don't build an entire data layer before anything renders.
- **Number acceptance criteria** (`AC-M1-1`, `AC-M3-5`) so commits, PRs and tasks can cite them.
- Every spec opens with a status (`borrador` / `aprobado` / `implementado` / `obsoleto`) and a date.
- Obsolete specs get marked, not deleted. The decision history is worth keeping.
- Never silently overwrite a plan that still has unchecked tasks — ask first.

See [specs/README.md](./specs/README.md) for the index of current specs.
