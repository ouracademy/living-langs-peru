# Constraints

> Última revisión: 2026-09-11 · Responsable: @artmadeit
> Este archivo es el nivel mínimo del proyecto. **No se debilita para que un cambio pase.**

Las reglas viven acá porque cada una necesita una razón escrita al lado del número. Los scripts de
`package.json` son envoltorios de conveniencia que deben reflejar esta tabla; si se separan, manda
este archivo.

## Cómo se corre

| Cuándo                 | Comando           | Qué corre                                                    | Presupuesto |
| ---------------------- | ----------------- | ------------------------------------------------------------ | ----------- |
| Después de editar      | `pnpm check:fast` | Tipos, lint, piso, política de idioma                        | ~15 s       |
| Al terminar una tarea  | `pnpm check:task` | Lo anterior + datos del diccionario + unit tests + cobertura | ~60 s       |
| Antes de un PR / en CI | `pnpm check:full` | Lo anterior + formato + secretos + dependencias + e2e        | minutos     |

Hay tres puntos donde esto se dispara solo: el hook `PostToolUse` de `.claude/` formatea el archivo
recién editado, el hook `pre-push` de husky corre `check:fast` antes de que algo salga de la laptop,
y el workflow `.github/workflows/ci.yml` corre todo en cada push y en cada PR. El `pre-push` se
puede saltear con `git push --no-verify` cuando hace falta; CI no.

Todo lo que mide un cambio lo mide **contra el merge base**, no contra todo el repo: la cobertura de
las líneas que tocaste es un número que el cambio puede mover; la del proyecto entero es heredada.

`pnpm typecheck` corre `next typegen` antes de `tsc` porque los tipos de ruta del App Router se
generan en `.next` (así lo indica `node_modules/next/dist/docs/.../06-cli/next.md`). Si `tsc` se
queja de un archivo dentro de `.next/dev/types`, borra `.next/dev` y vuelve a correr: son tipos
viejos de una ruta que ya no existe.

## Piso (siempre se exige, bloquea)

Verificado por `pnpm check:floor` (`scripts/check-floor.ts`), acotado al diff.

- Sin comentarios que apaguen un checker: `@ts-ignore`, `@ts-nocheck`, `@ts-expect-error`,
  `eslint-disable`, `istanbul ignore`, `v8 ignore`, `nosemgrep`, `gitleaks:allow`.
- Sin trabajo a medias disfrazado de terminado: `throw new Error("not implemented")`, `catch {}`
  vacío, `TODO` o `FIXME` en código (en `tasks/*.md` sí, ahí es donde van).
- Sin tests apagados ni borrados: `.skip`, `.todo`, `xit`, `xdescribe`, ni eliminar un archivo
  `*.test.ts`. Tampoco sacar un `expect` de un test que se queda.
- Sin secretos en el código (`gitleaks`, ver la tabla de abajo).
- Sin bajar un número de este archivo ni de `package.json` sin una decisión explícita.
- Sin agregar una fila a la tabla de excepciones sin dueño y fecha de vencimiento.

Apretar el nivel es silencioso; aflojarlo es ruidoso. Eso es a propósito.

## Idioma: código en inglés, personas en español

El código lo leemos nosotros y se escribe en inglés. El español es para el texto que lee la gente.
Verificado por `pnpm check:language` (`scripts/check-language-policy.ts`), acotado al diff.

| Va en inglés                                                   | Va en español                                       |
| -------------------------------------------------------------- | --------------------------------------------------- |
| Variables, funciones, tipos, clases (`searchEntries`, `Entry`) | Copy de la UI (`«Elegir una lengua»`)               |
| Nombres de archivo y carpeta, en kebab-case (`entry-list.tsx`) | Mensajes de error que ve el usuario                 |
| Claves de JSON en `src/data/**` (`word`, `translations`)       | Segmentos de URL (`/diccionario/[lengua]`)          |
| Códigos de error de la API (`language_not_found`)              | Especificaciones, planes y docs (`specs/`, `docs/`) |
| Comentarios en el código                                       | Mensajes de los scripts de tooling                  |

La frontera está en el handler: el segmento de URL entra en español y se renombra de una vez.

```ts
const { lengua: language } = await params; // la URL es en español, el código no
```

Las propiedades de objeto y el destructuring quedan fuera del check a propósito: `{ lengua: string }`
en un route handler es Next.js nombrando la URL, y renombrarlo rompe la ruta.

El check es una heurística sobre una lista corta de términos del dominio (`palabra`, `lengua`,
`traducción`, `búsqueda`...) en posición de declaración, no un parser. No va a atrapar todo
identificador en español; atrapa los que este dominio produce, en el momento en que renombrar
todavía es barato. Los commits siguen en inglés y en [Conventional
Commits](https://www.conventionalcommits.org/) (`commit-msg` con commitlint).

## Se exige con números

| Dimensión             | Regla                                        | Lo verifica                                        | Corre en         |
| --------------------- | -------------------------------------------- | -------------------------------------------------- | ---------------- |
| Tipos                 | Cero errores                                 | `pnpm typecheck`                                   | cada edición, CI |
| Lint                  | Cero errores, máximo 13 warnings             | `pnpm lint`                                        | cada edición, CI |
| Formato               | Prettier limpio                              | `pnpm format:check` (+ hook `PostToolUse`)         | al editar, CI    |
| Piso                  | Cero hallazgos                               | `pnpm check:floor`                                 | cada edición, CI |
| Idioma                | Cero hallazgos                               | `pnpm check:language`                              | cada edición, CI |
| Datos del diccionario | Cero problemas de validación                 | `pnpm dictionary:check`                            | fin de tarea, CI |
| Tests unitarios       | Todos pasan                                  | `pnpm test`                                        | fin de tarea, CI |
| Cobertura del cambio  | ≥ 80 % de las líneas instrumentables tocadas | `pnpm test:coverage && pnpm check:coverage`        | fin de tarea, CI |
| E2E                   | Todos pasan                                  | `pnpm test:e2e`                                    | CI               |
| Secretos              | Cero hallazgos, siempre con `--redact`       | `gitleaks git . --redact` (`pnpm check:secrets`)   | CI               |
| Dependencias          | Cero vulnerabilidades conocidas              | `osv-scanner scan source -r .` (`pnpm check:deps`) | CI               |
| Node                  | >= 22                                        | `.nvmrc`, `engines`, hook `commit-msg`             | siempre          |

Las razones de cada número:

- **Máximo 13 warnings de lint.** Son las que hay hoy, todas en `src/components/header.tsx`
  (imports y estado sin usar). El número es un trinquete: solo baja. Poner 0 hoy sería un build
  rojo permanente, y un build rojo permanente se aprende a ignorar.
- **80 % de cobertura en líneas cambiadas.** Alto para obligar a escribir un test, bajo para dejar
  pasar una línea de configuración. Se mide sobre las líneas instrumentables del diff: comentarios y
  líneas en blanco no diluyen el número en ninguna dirección.
  **Hoy avisa y no bloquea** (`--warn` en `package.json`): el repo está en 46,6 % y el número es
  nuevo. Saca el `--warn` cuando el equipo lo tenga internalizado; la fecha propuesta es el
  **2026-09-25** (dos semanas).
- **Cero vulnerabilidades en dependencias.** `osv-scanner` falla con cualquier hallazgo, no solo con
  los de severidad alta. El árbol de dependencias es chico, así que el ruido es manejable. Si una
  vulnerabilidad no se puede arreglar hoy, la salida es un `osv-scanner.toml` con `ignoreUntil`
  (vencimiento obligatorio) más una fila en la tabla de excepciones — no bajar la regla.
- **`--redact` en gitleaks no es opcional.** Sin eso, el secreto encontrado se imprime en el log de
  CI y se filtra una segunda vez. Se reporta la regla y el archivo, nunca el valor.
- **Node >= 22.** `commitlint`, `vitest` y `node --experimental-strip-types` lo necesitan. Con Node
  18 los tests fallan con un `SyntaxError` de `node:util` que no dice nada útil. Corre `nvm use`.

Nota sobre `gitleaks` y `osv-scanner`: se instalan a nivel de máquina, así que el punto de
exigencia es CI, con versión fijada (una herramienta que cambia sus reglas sola cambia el nivel sin
que nadie lo decida). En local, `pnpm check:secrets` y `pnpm check:deps` avisan si el binario no
está en vez de fallar. Instalación opcional: `brew install gitleaks osv-scanner`.

`osv-scanner` es la única verificación del set cuyo veredicto no sale de nuestro propio código ni de
nuestros propios tests: lee la base de datos OSV. Sin al menos una opinión externa, el nivel se
reduce a estar de acuerdo con uno mismo.

## Medido, no exigido

Valores de hoy (2026-09-11, `pnpm test:coverage`). La dirección es lo que importa: estos números no
deberían empeorar. Tolerancia 0,5 % para absorber el ruido de un archivo que se mueve.

| Métrica                        | Hoy    | Dirección |
| ------------------------------ | ------ | --------- |
| Cobertura de líneas (proyecto) | 46,6 % | no baja   |
| Statements                     | 49,3 % | no baja   |
| Branches                       | 56,6 % | no baja   |
| Functions                      | 31,4 % | no baja   |
| Warnings de lint               | 13     | solo baja |
| Tests unitarios                | 100    | solo sube |

La cobertura del proyecto es baja porque incluye todos los componentes de marketing, que no tienen
tests y hoy no los necesitan. Por eso lo que se exige es la cobertura del cambio, no esta.

## Excepciones

Ninguna vigente hoy. Formato: una fila por excepción, con dueño y vencimiento (90 días es el
default: alcanza para planificar el arreglo y es corto para acordarse). `scripts/check-floor.ts` y
`scripts/check-language-policy.ts` leen esta tabla; una fila vencida deja de excusar y se reporta
como hallazgo.

| ID  | Regla | Ruta | Razón | Dueño | Vence |
| --- | ----- | ---- | ----- | ----- | ----- |

Las columnas van en ese orden: ID (`E` seguido de un número), la regla que se excusa tal como la
nombra el script (`kebab-case-filename`, `silenced-checker`, ...) o `*` para cualquiera, la ruta
(admite `*` y `**`), la razón, el dueño con `@`, y la fecha de vencimiento en `YYYY-MM-DD`.

No hay ejemplo escrito acá a propósito: los scripts leen cualquier fila cuyo segundo campo sea
`E` más un número, así que un ejemplo se convertiría en una excepción real.

## Pendientes que no son constraints todavía

Escritos acá para que no se pierdan, sin número y sin herramienta detrás:

- **Accesibilidad.** `@axe-core/playwright` dentro de los e2e que ya existen daría cero violaciones
  critical/serious sobre WCAG 2.1 AA, reusando el `webServer` de Playwright. Es la opinión externa
  más valiosa que le falta a este set, y en un sitio público de lenguas originarias es la que más
  se nota.
- **Core Web Vitals.** Lighthouse contra el build (`LCP ≤ 2500 ms`, `CLS ≤ 0,1`). `eslint-config-next`
  ya trae `core-web-vitals`, pero eso es estático: no mide.
- **Tamaño del bundle.** `size-limit` con el valor de hoy como techo.
