# Especificaciones

Un archivo por **feature**, no por módulo. Una feature que se compone de varias capacidades
verificables por separado declara su mapa de capacidades dentro de su propio archivo, para que el
diseño completo se lea de una sola vez.

| Spec                               | Estado   | Plan                                        | Alcance                                                  |
| ---------------------------------- | -------- | ------------------------------------------- | -------------------------------------------------------- |
| [diccionario.md](./diccionario.md) | Aprobado | [tasks/diccionario/](../tasks/diccionario/) | Página de diccionario, API, selector de lengua, fuentes. |

## Dónde va cada cosa

El nombre de la feature es la clave compartida entre las tres carpetas.

- **`specs/<feature>.md`** — lo que vamos a construir: objetivos, contratos, criterios de aceptación,
  límites. Se escribe antes del código y se actualiza cuando una decisión cambia.
- **`tasks/<feature>/`** — cómo lo construimos: `plan.md` (fases, riesgos, checkpoints) y `todo.md`
  (la lista ejecutable).
- **`docs/`** — resultados y referencia: investigación de fuentes, ADRs, notas de operación.
  Se escribe durante o después del trabajo.

La regla completa está en [AGENTS.md](../AGENTS.md#specs-and-plans).

## Convenciones

- Nombre de archivo en kebab-case y en español, igual que la ruta que describe
  (`/diccionario` → `diccionario.md`).
- Cada spec abre con estado (`borrador` / `aprobado` / `implementado` / `obsoleto`) y fecha.
- Los criterios de aceptación se numeran (`AC-M1-1`) para poder citarlos en commits y PRs.
- Un spec obsoleto se marca como tal y se deja; no se borra. El historial de decisiones tiene valor.
