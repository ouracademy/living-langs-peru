# Diccionario de lenguas originarias

> Estado: **implementado** (M1-M5). Contenido real citado, 169 entradas.
> Fecha: 2026-09-11 · Rama base: `main` · Rama de trabajo: `feat/diccionario`
> Plan: [tasks/diccionario/](../tasks/diccionario/) · Índice: [specs/README.md](./README.md)

---

## 1. Objetivo

Añadir una página de diccionario para las lenguas originarias del Perú, con Asháninka como lengua por
defecto, buscable, ordenada alfabéticamente, con ejemplos de uso en oraciones, y con enlaces
compartibles hacia una palabra concreta.

**Usuarios objetivo**

| Usuario                        | Necesidad principal                                              |
| ------------------------------ | ---------------------------------------------------------------- |
| Aprendiz / público general     | Buscar una palabra y entender cómo se usa en una oración real.   |
| Docente de EIB                 | Compartir el enlace de una palabra concreta con sus estudiantes. |
| Hablante / comunidad           | Ver su lengua representada con ortografía y ejemplos correctos.  |
| Investigador / consumidor ext. | Consumir los datos programáticamente vía API.                    |

**Qué NO es este trabajo**

- No es un traductor automático ni un conjugador.
- No es un panel de edición: el contenido se versiona en git, no se edita desde el navegador.
- **No incluye audio de pronunciación.** Descartado explícitamente (antes era pregunta abierta #4).
- No incluye autenticación ni contribuciones de usuarios.

---

## 2. Decisiones tomadas

Cerradas. El resto de la especificación las asume.

| #   | Decisión                 | Elección                                                                                                                                                                                                       |
| --- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Almacén de datos         | JSON versionado en el repo, un archivo por lengua.                                                                                                                                                             |
| 2   | Ruta                     | `/diccionario/[lengua]?palabra=X`. `/diccionario` redirige a Asháninka.                                                                                                                                        |
| 3   | Acceso a datos           | Capa compartida en `src/lib/dictionary/`. La página la lee directo (Server Component); el Route Handler llama a la MISMA capa y existe para terceros.                                                          |
| 4   | Selector de lengua       | En la propia página del diccionario, junto al buscador. **No** se toca el header ni el layout global.                                                                                                          |
| 5   | Verificación             | Vitest (lógica) + Playwright (E2E). Ambos se instalan en este trabajo.                                                                                                                                         |
| 6   | API                      | Next 16 Route Handlers (`src/app/api/diccionario/.../route.ts`).                                                                                                                                               |
| 7   | **Idioma del código**    | **Todo el código en inglés**: nombres de archivo, tipos, campos, funciones, variables, claves JSON, códigos de error. Ver §11.1 para las tres excepciones.                                                     |
| 8   | **Título de página**     | `generateMetadata` por lengua, **estático**: «Diccionario Asháninka». No se lee `searchParams`, así que el `<title>` no lleva la palabra concreta y la ruta sigue prerenderizada. (Antes pregunta abierta #2.) |
| 9   | **Escala**               | Menos de ~5 000 entradas. Sin virtualización, filtrado en cliente. Guardarraíl medible en §6.7. (Antes pregunta abierta #3.)                                                                                   |
| 10  | **Enlace desde el home** | La tarjeta «Diccionario» de `src/components/resources.tsx` ya existe con `href="#"` muerto: se le pone `/diccionario/ashaninka`. Un solo atributo. (Antes pregunta abierta #5.)                                |

---

## 3. Mapa de capacidades

Cinco capacidades verificables por separado. Las flechas indican dependencia, **no orden de escritura**
— el orden de tareas está en [tasks/diccionario/plan.md](../tasks/diccionario/plan.md), que corta
vertical.

```
M1 dictionary-data ──┬──> M2 dictionary-api
                     │
                     ├──> M3 dictionary-page ──> M4 language-picker
                     │
                     └──> M5 content-sources
```

| id  | Módulo            | Entrega                                                                | Depende de | Verificable por       |
| --- | ----------------- | ---------------------------------------------------------------------- | ---------- | --------------------- |
| M1  | `dictionary-data` | Tipos, esquema JSON, semilla, y lógica de orden/búsqueda/agrupado.     | —          | Vitest (pura)         |
| M2  | `dictionary-api`  | Route Handlers `GET /api/diccionario*`.                                | M1         | Vitest + curl         |
| M3  | `dictionary-page` | Ruta `/diccionario/[lengua]`, lista A-Z, buscador, detalle, deep-link. | M1         | Playwright            |
| M4  | `language-picker` | Dropdown que navega entre lenguas conservando el contexto.             | M3         | Playwright            |
| M5  | `content-sources` | Investigación de fuentes + licencias + script de importación.          | M1         | Revisión humana + CLI |

---

## 4. M1 — `dictionary-data`

### 4.1 Modelo de datos

`src/lib/dictionary/types.ts`

```ts
export type PartOfSpeech =
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "pronoun"
  | "interjection"
  | "phrase";

export type Example = {
  sentence: string; // en la lengua originaria
  translation: string; // en español
  sourceId?: string; // referencia a sources.json (M5)
};

export type Entry = {
  id: string; // slug URL-safe, único dentro de la lengua
  word: string; // forma canónica, tal como se escribe
  variants?: string[]; // grafías alternativas, también buscables
  translations: string[]; // al menos 1, en español
  partOfSpeech?: PartOfSpeech;
  examples: Example[]; // puede estar vacío
  notes?: string;
  sourceId?: string;
};

export type Dictionary = {
  language: LanguageSlug; // reutiliza el tipo de src/lib/languages.ts
  entries: Entry[];
};
```

### 4.2 Archivos de datos

- `src/data/dictionary/ashaninka.json` — semilla de **30–40 entradas**, al menos 10 con ejemplos.
- `src/data/dictionary/uro.json` — **no se crea en este trabajo**, por falta de una fuente uro con
  licencia. `uro` existe en `src/lib/languages.ts`, así que `/diccionario/uro` renderiza un estado
  «aún no disponible» que lo explica y enlaza a los diccionarios existentes (ver AC-M3-7).

Regla: **una lengua puede existir sin diccionario.** La disponibilidad se deriva de la existencia del
archivo, no de una bandera en `languages.ts`.

### 4.3 API pública de la capa

`src/lib/dictionary/index.ts`

```ts
getDictionary(language: string): Dictionary | null
getLanguagesWithDictionary(): { slug: LanguageSlug; name: string; total: number }[]
resolveWord(entries: Entry[], value: string): Entry | undefined
searchEntries(entries: Entry[], query: string): Entry[]
groupByLetter(entries: Entry[]): { letter: string; entries: Entry[] }[]
```

`src/lib/dictionary/text.ts` (funciones puras, el corazón de los tests)

```ts
normalize(text: string): string        // minúsculas + quita diacríticos, PRESERVA ñ
slugify(word: string): string          // URL-safe, estable
compareWords(a: string, b: string): number
```

`src/lib/dictionary/registry.ts` — mapa explícito `{ ashaninka: ashaninkaJson }` con imports
estáticos. No se usa `fs` en runtime: así funciona igual en Server Components y en Route Handlers, y
queda tipado. `resolveJsonModule` ya está activo en `tsconfig.json`.

### 4.4 Semántica que hay que respetar

**Normalización** — `normalize` baja a minúsculas y quita tildes vía `NFD` + rango combinante, pero
**`ñ` se preserva como letra propia**: en Asháninka `ñ` no es una `n` acentuada. Implementación:
proteger `ñ` antes del `NFD` y restaurarla después.

**Orden alfabético** — por el **alfabeto oficial de la lengua**, no el español. El asháninka tiene 19
letras (RD 0606-2008-ED, RM 303-2015-MINEDU): `a b ch e i j k m n ñ o p r s sh t ts ty y`. `ch`, `sh`,
`ts` y `ty` son letras propias, así que ordenan y agrupan como unidades; no existen `c`, `d`, `f`, `g`,
`l`, `q`, `u`, `v`, `w`, `x` ni `z`. La tabla vive en `src/lib/dictionary/collation.ts`, es por lengua,
y cae a `Intl.Collator("es")` para lenguas sin tabla propia.

**Agrupado por letra** — una sección por letra inicial de la forma normalizada, en mayúscula. Las
entradas que empiezan por dígito o símbolo van a un grupo final `#`. No se crean secciones vacías.

**Ranking de búsqueda** — `searchEntries` compara contra `word`, `variants` y `translations`, todo
normalizado, y ordena por:

1. Coincidencia exacta con `word` o una variante.
2. `word`/variante empieza por la consulta.
3. `word`/variante contiene la consulta.
4. Alguna `translation` empieza por la consulta.
5. Alguna `translation` contiene la consulta.

Dentro del mismo nivel, orden alfabético. Consulta vacía → todas las entradas ordenadas. La búsqueda
es bidireccional a propósito: buscar `casa` debe encontrar la palabra asháninka cuya traducción es
«casa».

**`resolveWord`** — busca primero por `id` exacto, luego por `word`/variante normalizada. Esto hace
que un enlace escrito a mano (`?palabra=ñaaka`) funcione igual que uno generado (`?palabra=naaka`).

**Validación** — `pnpm run dictionary:check` valida cada JSON: `id` único, `id` igual a
`slugify(word)`, `translations` no vacío, y cada `example` con `sentence` y `translation` no vacías.
Falla con código de salida ≠ 0 y lista los errores.

### 4.5 Criterios de aceptación

- **AC-M1-1** `normalize("Ñaaka")` → `"ñaaka"`; `normalize("Perú")` → `"peru"`.
- **AC-M1-2** `compareWords` coloca `ñ` después de `n` y antes de `o`, y no separa `á` de `a`.
- **AC-M1-3** `groupByLetter` no devuelve grupos vacíos y agrupa `Á`/`A` juntas.
- **AC-M1-4** `searchEntries` con consulta vacía devuelve todo, ordenado.
- **AC-M1-5** Buscar sin tildes encuentra la entrada con tildes, y viceversa.
- **AC-M1-6** Buscar en español (`"casa"`) encuentra la entrada por su traducción.
- **AC-M1-7** El ranking de los 5 niveles se cumple con un fixture diseñado para ello.
- **AC-M1-8** `resolveWord` acierta por `id` y por palabra cruda con distinta caja y tildes.
- **AC-M1-9** `getDictionary("uro")` → `null`. `getDictionary("klingon")` → `null`.
- **AC-M1-10** `dictionary:check` pasa sobre la semilla y falla ante un `id` duplicado inyectado.

---

## 5. M2 — `dictionary-api`

### 5.1 Endpoints

| Método y ruta                        | Devuelve                                                         |
| ------------------------------------ | ---------------------------------------------------------------- |
| `GET /api/diccionario`               | Lenguas con diccionario disponible y su total de entradas.       |
| `GET /api/diccionario/[lengua]`      | Entradas de la lengua. Params: `q`, `limit` (máx 500), `offset`. |
| `GET /api/diccionario/[lengua]/[id]` | Una entrada. `404` si no existe.                                 |

Solo `GET`. Cualquier otro verbo devuelve `405` (comportamiento por defecto de Next).

### 5.2 Formato de respuesta

Claves en inglés (decisión #7). El texto legible de los mensajes va en español, porque lo lee gente.

```jsonc
// GET /api/diccionario/ashaninka?q=casa&limit=20
{
  "language": "ashaninka",
  "total": 3, // coincidencias totales, antes de paginar
  "offset": 0,
  "limit": 20,
  "entries": [/* Entry[] */],
}
```

Errores, siempre con `Content-Type: application/json`:

```jsonc
{
  "error": "language_not_found",
  "message": "No hay diccionario para «klingon».",
}
```

Códigos de `error`: `language_not_found` (404), `entry_not_found` (404), `invalid_parameter` (400).

### 5.3 Notas de implementación

- Los handlers **no** duplican lógica: importan de `src/lib/dictionary/` (decisión #3).
- Cache Components no está activado en `next.config.ts`, así que aplica el modelo clásico: los Route
  Handlers **no se cachean por defecto**. `GET /api/diccionario` y `/api/diccionario/[lengua]/[id]`
  pueden llevar `export const dynamic = "force-static"`. `/api/diccionario/[lengua]` lee
  `request.nextUrl.searchParams` para `q`, así que **se queda dinámico**; eso es correcto y no hay que
  forzarlo.
- Tipar el contexto con el helper global `RouteContext<'/api/diccionario/[lengua]'>`.
- Sin CORS abierto en v1. Si se quiere consumo desde otros dominios, es una decisión aparte.

### 5.4 Criterios de aceptación

- **AC-M2-1** `GET /api/diccionario` lista `ashaninka` con su total y **no** lista `uro`.
- **AC-M2-2** `GET /api/diccionario/ashaninka` devuelve las entradas ordenadas alfabéticamente.
- **AC-M2-3** `?q=` filtra y `total` refleja las coincidencias, no la página.
- **AC-M2-4** `?limit=1000` → `400 invalid_parameter`. `?limit=abc` → `400`.
- **AC-M2-5** `GET /api/diccionario/uro` → `404 language_not_found`.
- **AC-M2-6** `GET /api/diccionario/ashaninka/<id-inexistente>` → `404 entry_not_found`.
- **AC-M2-7** `POST /api/diccionario/ashaninka` → `405`.

---

## 6. M3 — `dictionary-page`

### 6.1 Contrato de URL

| URL                                       | Comportamiento                                                                                                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/diccionario`                            | Redirige a `/diccionario/ashaninka` (redirect en `next.config.ts`, `permanent: false` — la lengua por defecto podría cambiar).                                |
| `/diccionario/ashaninka`                  | Lista completa, ninguna palabra seleccionada.                                                                                                                 |
| `/diccionario/ashaninka?palabra=<id>`     | Igual, con esa entrada abierta y visible al cargar.                                                                                                           |
| `/diccionario/ashaninka?palabra=<basura>` | La página **carga normal** y muestra un aviso «no encontramos esa palabra». **No** es un 404.                                                                 |
| `/diccionario/uro`                        | Lengua conocida sin datos: página real (200) que lo explica y enlaza a los diccionarios que sí existen. **No** es un 404: un enlace compartido no debe morir. |
| `/diccionario/klingon`                    | Lengua desconocida: `notFound()` → 404.                                                                                                                       |

Las URLs quedan en español (§11.1): el sitio es `lang="es"` y las rutas existentes ya son
`/lenguas/[slug]`.

### 6.2 Estructura y renderizado

```
src/app/diccionario/layout.tsx               cabecera + pie del sitio
src/app/diccionario/[lengua]/page.tsx        Server Component
  └─ <Suspense>
       └─ <Dictionary entries={...} languages={...} />   Client Component
```

- La página es un **Server Component** que llama a `getDictionary()` directamente y expone
  `generateStaticParams()` sobre las lenguas con diccionario. **No lee `searchParams`**, para no optar
  la ruta a renderizado dinámico.
- `generateMetadata()` devuelve el título por lengua: «Diccionario Asháninka» (decisión #8). El
  `template` de `layout.tsx` lo completa a «Diccionario Asháninka | Lenguas originarias de Peru».
- El Client Component lee `?palabra` con `useSearchParams()` y va envuelto en `<Suspense>`, como pide
  la documentación de Next: al prerenderizar, `useSearchParams` fuerza render en cliente del árbol
  hasta el `Suspense` más cercano.
- El texto de búsqueda vive en **estado local, no en la URL**. Solo `palabra` viaja en la URL.

### 6.3 Comportamiento de la interfaz

- **Buscador**: input de texto, filtra en vivo (debounce ~150 ms), con botón para limpiar. Muestra el
  número de resultados.
- **Lista**: agrupada por letra, con encabezado de sección pegajoso (sticky) y un índice A-Z para
  saltar de letra. Se renderiza completa en el cliente (decisión #9).
- **Detalle**: al hacer clic en una palabra se muestra `word`, `partOfSpeech`, `translations`, `notes`
  y **los ejemplos de uso en oraciones** (oración en la lengua + traducción al español). Si la entrada
  no tiene ejemplos, se dice explícitamente («Aún no tenemos ejemplos de uso para esta palabra»); no
  se deja un hueco silencioso.
- **Sincronización de URL**:
  - clic en una palabra → `router.push` (el botón «atrás» del navegador vuelve a la anterior);
  - cerrar el detalle → `router.replace` quitando `palabra`;
  - el scroll no debe saltar al tope al actualizar la URL (`{ scroll: false }`).
- **Botón de copiar enlace** en el detalle: pone la URL absoluta con `?palabra=` en el portapapeles.
- **Responsive**: en móvil el detalle aparece como panel/hoja inferior; en escritorio, en dos columnas
  (lista + detalle).

### 6.4 Accesibilidad (obligatorio, no opcional)

- El input de búsqueda tiene `<label>` asociado (visible o `sr-only`).
- El contador de resultados va en una región `aria-live="polite"`.
- Las palabras de la lista son elementos enfocables y activables con teclado (`Enter`/`Space`), con
  `aria-current` en la seleccionada.
- Contraste AA en todos los pares texto/fondo (la paleta del sitio usa `#FFF7E8`, `#E4572E`,
  `#1B98A0`, `#F2B705`, `#241D14`: `#F2B705` sobre blanco **no** cumple AA para texto pequeño).
- Las oraciones de ejemplo se marcan con `lang="cni"` (código ISO 639-3 del Asháninka) para que los
  lectores de pantalla no las pronuncien como español.

### 6.5 Enlace desde el home

`src/components/resources.tsx` ya tiene una tarjeta «Diccionario» con `cta: "Buscar"` y un
`href="#"` muerto. El cambio es darle destino:

- La tarjeta «Diccionario» apunta a `/diccionario/ashaninka`.
- Las otras tres tarjetas (`Traductor`, `Info general`, `Otros sitios`) **se dejan como están**, con su
  `href="#"`. No están en alcance.

No se toca `header.tsx`, `layout.tsx` ni `language.tsx`.

> Nota aparte, no es trabajo de este spec: `language.tsx` enlaza a `/uro`, que hoy no existe como
> ruta y da 404. Bug preexistente; no copiar ese patrón.

### 6.6 Componentes que faltan

`src/components/ui/` hoy tiene `button`, `card`, `sheet`, `navigation-menu`, `dropdown-menu`. Hay que
añadir vía shadcn (estilo `base-nova`, base-ui): **`input`**. Para M4 basta con `dropdown-menu`, que
ya existe.

### 6.7 Guardarraíl de tamaño

Decisión #9 fija menos de ~5 000 entradas y filtrado en cliente. Pero la página pasa `entries` como
props, así que los datos viajan completos en el payload RSC. Umbral medible:

- Mientras los datos serializados estén **por debajo de ~150 KB comprimidos**, se pasan enteros.
- Si lo superan, se parte: la lista recibe un índice ligero (`id`, `word`, primera traducción) y el
  detalle se pide a `GET /api/diccionario/[lengua]/[id]` — que es justamente lo que M2 construye.

Se mide con contenido real (tarea T7.6), no antes.

### 6.8 Criterios de aceptación

- **AC-M3-1** `/diccionario` redirige a `/diccionario/ashaninka`.
- **AC-M3-2** La lista se muestra ordenada alfabéticamente y agrupada por letra.
- **AC-M3-3** Escribir en el buscador filtra la lista y actualiza el contador de resultados.
- **AC-M3-4** Clic en una palabra muestra sus traducciones y sus ejemplos de uso, y la URL pasa a
  contener `?palabra=<id>`.
- **AC-M3-5** Abrir directamente `/diccionario/ashaninka?palabra=<id>` en una pestaña nueva muestra
  esa entrada ya abierta, sin interacción previa.
- **AC-M3-6** Una entrada sin ejemplos muestra el mensaje explícito de «sin ejemplos».
- **AC-M3-7** `/diccionario/klingon` da 404. `/diccionario/uro` da 200 y explica que aún no hay datos.
  `?palabra=basura` **no** da 404 y muestra el aviso.
- **AC-M3-8** El botón «atrás» del navegador vuelve a la palabra anterior.
- **AC-M3-9** Toda la página es operable solo con teclado, de principio a fin.
- **AC-M3-10** El `<title>` de `/diccionario/ashaninka` contiene «Diccionario Asháninka».
- **AC-M3-11** Desde el home, la tarjeta «Diccionario» lleva a `/diccionario/ashaninka`.
- **AC-M3-12** La página lleva la cabecera y el pie del sitio, y los encabezados de letra quedan por
  debajo de la cabecera pegajosa.

---

## 7. M4 — `language-picker`

- Dropdown (`dropdown-menu`, ya presente) en la cabecera de la página del diccionario, junto al
  buscador. **No se modifica `src/components/header.tsx` ni `src/app/layout.tsx`.**
- Lista todas las lenguas de `src/lib/languages.ts`. Las que no tienen diccionario aparecen
  **deshabilitadas** con la etiqueta «pronto», no ocultas: comunican el alcance del proyecto.
- Elegir una lengua navega a `/diccionario/<slug>`, **descartando `?palabra`** (un id de entrada no
  significa nada en otra lengua) y limpiando el texto de búsqueda.
- Muestra la lengua activa y el total de entradas.

**Criterios de aceptación**

- **AC-M4-1** El selector muestra la lengua activa al cargar (Asháninka por defecto).
- **AC-M4-2** Uro aparece deshabilitado y no navega.
- **AC-M4-3** Cambiar de lengua actualiza la ruta y descarta `?palabra`.
- **AC-M4-4** El selector es navegable con teclado y anuncia su estado a lectores de pantalla.
- **AC-M4-5** `git diff` no toca `header.tsx` ni `layout.tsx`.

---

## 8. M5 — `content-sources`

**Investigación de contenido**, no código de producto. Se entrega aparte para que la decisión
editorial no bloquee la interfaz.

### 8.1 Licencias: qué aplica y qué no

El proyecto es **público, gratuito y sin fines comerciales**, con la UNMSM y el Ministerio de Cultura
como aliados. Eso resuelve algunas restricciones y no resuelve otras:

- **NC (no comercial): cumplida de fábrica.** Una fuente CC BY-NC o CC BY-NC-SA es usable con
  atribución.
- **BY (atribución): cumplida.** Cada entrada cita su fuente vía `sourceId`.
- **ND (sin derivadas): bloqueo real.** Extraer entradas a una base de datos buscable es una obra
  derivada, y el ND lo prohíbe aunque el uso sea gratuito y citado. Citar no cura el ND.
- **Sin licencia declarada: bloqueo.** Por defecto son todos los derechos reservados. Ser sin ánimo
  de lucro no crea una licencia inexistente; hay que pedirla.

**La distinción que hace viable el proyecto:** el copyright de un diccionario no cubre el hecho de
que una palabra signifique lo que significa, sino la selección, el orden y la redacción de sus
definiciones y ejemplos. Por tanto:

- Compilar **pares palabra→traducción** de varias fuentes, en nuestro orden y citando cada una:
  terreno firme.
- **Oraciones de ejemplo**: expresión creativa. Solo con permiso explícito o recogidas con hablantes.
- **Copiar la lista completa de una sola obra**: infringe el copyright de compilación. No se hace.

Y una capa que no es legal: es conocimiento de un pueblo indígena, así que el permiso de una
editorial no equivale al consentimiento de la comunidad. Ver [docs/dictionary-sources.md](../docs/dictionary-sources.md).

### 8.2 Entregables

1. `docs/dictionary-sources.md` — tabla de fuentes candidatas con: nombre, URL, institución, licencia
   declarada, veredicto (`usable` / `requiere-permiso` / `no-usable`), cobertura estimada, y calidad de
   la ortografía.
2. `src/data/dictionary/sources.json` — las fuentes aprobadas, con `id`, cita completa y URL, para que
   `Entry.sourceId` y `Example.sourceId` apunten a ellas.
3. Atribución visible en la interfaz: la página del diccionario muestra las fuentes, y el detalle de
   una entrada muestra la suya cuando la tiene.
4. `scripts/import-dictionary.ts` — CLI que convierte un volcado de fuente (CSV/JSON) al esquema de
   M1, ejecuta `dictionary:check` y escribe el JSON de la lengua. Idempotente: correrlo dos veces da
   el mismo archivo.

### 8.3 Criterios de aceptación

- **AC-M5-1** Cada fuente en `docs/dictionary-sources.md` tiene licencia y veredicto explícitos.
- **AC-M5-2** No entra al repo ninguna entrada procedente de una fuente marcada `no-usable` o
  `requiere-permiso` sin permiso registrado.
- **AC-M5-3** Toda entrada importada tiene `sourceId` resoluble en `sources.json`.
- **AC-M5-4** La atribución es visible en la interfaz, no solo en un archivo del repo.
- **AC-M5-5** El importador es idempotente y su salida pasa `dictionary:check`.

---

## 9. Estructura de archivos

Archivos nuevos, salvo donde se indique. Nombres en inglés (decisión #7), excepto los segmentos de
ruta bajo `src/app/`, que **son** la URL.

```
src/
├── app/
│   ├── api/diccionario/
│   │   ├── route.ts                        M2  lenguas disponibles
│   │   └── [lengua]/
│   │       ├── route.ts                    M2  entradas + ?q
│   │       └── [id]/route.ts               M2  una entrada
│   └── diccionario/
│       └── [lengua]/page.tsx               M3  Server Component
├── components/
│   ├── dictionary/
│   │   ├── dictionary.tsx                  M3  Client Component raíz
│   │   ├── search-box.tsx                  M3
│   │   ├── entry-list.tsx                  M3  agrupado A-Z + índice
│   │   ├── entry-detail.tsx                M3  traducciones + ejemplos
│   │   └── language-picker.tsx             M4
│   └── ui/input.tsx                        M3  añadir vía shadcn
├── data/dictionary/
│   ├── ashaninka.json                      M1  semilla 30-40 entradas
│   └── sources.json                        M5
└── lib/dictionary/
    ├── index.ts                            M1  API de la capa
    ├── types.ts                            M1
    ├── registry.ts                         M1  imports estáticos de los JSON
    └── text.ts                             M1  normalize/slugify/compareWords

scripts/
├── validate-dictionary.ts                  M1
└── import-dictionary.ts                    M5

tests/
├── unit/dictionary/                        M1, M2  Vitest
└── e2e/dictionary.spec.ts                  M3, M4  Playwright

docs/dictionary-sources.md                  M5

MODIFICADOS:
  next.config.ts            redirect /diccionario -> /diccionario/ashaninka
  components/resources.tsx  href de la tarjeta «Diccionario»  (M3, §6.5)
  package.json              scripts + dependencias de test
  vitest.config.mts         nuevo
  playwright.config.ts      nuevo
```

`src/lib/languages.ts` **no se modifica**: la disponibilidad de diccionario se deriva de la existencia
del archivo de datos, no de una bandera nueva.

---

## 10. Comandos

Existentes:

```bash
pnpm dev              # servidor de desarrollo
pnpm build            # build de producción
pnpm lint             # eslint
pnpm format           # prettier --write .
pnpm format:check     # prettier --check .
```

A añadir en `package.json`:

```bash
pnpm test                    # vitest run
pnpm test:watch              # vitest
pnpm test:e2e                # playwright test
pnpm dictionary:check        # valida los JSON del diccionario
```

Dependencias nuevas (dev), según las guías de Next 16:

```
vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths
@playwright/test
```

**Antes de cualquier commit:** `nvm use` (requiere Node ≥ 22, ver `.nvmrc`), porque el hook
`commit-msg` de husky + commitlint lo necesita.

---

## 11. Estilo de código

### 11.1 Idioma

**Todo el código en inglés** (decisión #7): nombres de archivo y carpeta, tipos, campos, funciones,
variables, claves de JSON de datos, claves y códigos de error de la API, ids de test.

Tres excepciones, y son excepciones por una razón concreta:

| Excepción                                               | Por qué                                                                                                                                            |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Segmentos de ruta** (`src/app/diccionario/[lengua]/`) | En el App Router el nombre de la carpeta **es** la URL. Renombrarlo a inglés cambiaría la URL pública, que ya se decidió en español (decisión #2). |
| **Query param `palabra`**                               | Es URL visible para el usuario, no un identificador de código.                                                                                     |
| **Texto para personas**                                 | Toda la interfaz, los mensajes de error legibles de la API, y el contenido de los diccionarios van en español.                                     |

Consecuencia práctica: `params.lengua` llega con nombre español porque la carpeta lo impone. Se
desestructura a una variable en inglés en la primera línea del componente:
`const { lengua: language } = await params`.

### 11.2 Lo demás

- **TypeScript estricto.** Sin `any`, sin `@ts-ignore`, sin `eslint-disable`. Si algo obliga a una
  supresión, se para y se discute, no se silencia.
- **Prettier** con `prettier-plugin-tailwindcss` decide el formato. No se discute a mano.
- **Server Components por defecto**; `"use client"` solo donde hace falta interactividad.
- **Tailwind v4** con las variables de `globals.css`. Se prefieren tokens a hex sueltos; el header
  actual usa hex literales, pero eso no es un patrón a extender.
- **Componentes pequeños y con una responsabilidad.** Si `dictionary.tsx` pasa de ~150 líneas, se
  divide.
- **Sin comentarios que narren lo obvio.** Se comenta el _por qué_ (ej. por qué se preserva la `ñ`).
- Commits en [Conventional Commits](https://www.conventionalcommits.org/), sujeto en minúscula e
  imperativo: `feat: add dictionary data layer`.

---

## 12. Estrategia de pruebas

**Vitest — lógica pura (M1, M2).** Es donde se rompen las cosas en silencio.

- `text.test.ts`: normalización con `ñ` y tildes, slugificado, comparador.
- `search.test.ts`: los 5 niveles de ranking, consulta vacía, búsqueda bidireccional es→lengua.
- `group.test.ts`: sin grupos vacíos, `Á` con `A`, grupo `#`.
- `api.test.ts`: se invocan las funciones `GET` exportadas con un `Request` construido a mano y se
  comprueban códigos y cuerpos.
- Fixtures propios en `tests/unit/dictionary/fixtures.ts`. **Los tests no dependen del contenido real
  del diccionario**, para que añadir palabras no rompa la suite.
- La página `async` **no** se testea con Vitest: la guía de Next dice explícitamente que Vitest no
  soporta Server Components asíncronos. Eso es territorio de Playwright.

**Playwright — flujos de usuario (M3, M4).** Corre contra `next build && next start`, no contra
`next dev`: AC-M3-5 depende de comportamiento de prerender que en `dev` no es idéntico.

- Deep-link: abrir `?palabra=<id>` directo muestra la entrada (AC-M3-5). Es el caso que se pidió
  expresamente y el más fácil de romper.
- Buscar → filtrar → clic → la URL cambia → «atrás» funciona.
- Cambio de lengua descarta `?palabra`.
- Recorrido completo con teclado.
- Uro deshabilitado.
- El home lleva al diccionario (AC-M3-11).

Nota: el servidor MCP de `playwright` **falló al conectar** en esta sesión. Es irrelevante para esto:
`@playwright/test` como dependencia de desarrollo y `pnpm test:e2e` funcionan por su cuenta.

**Definición de terminado, por módulo:** `pnpm test` pasa · `pnpm lint` limpio · `pnpm build` pasa ·
`/diccionario/[lengua]` sigue saliendo estática en la tabla de `build` · comportamiento verificado en
el navegador de verdad · sin regresiones en las páginas existentes.

---

## 13. Límites

**Hacer siempre**

- Leer `node_modules/next/dist/docs/` antes de usar una API de Next que no se haya usado ya en el
  repo. Esta versión trae cambios que rompen respecto a lo conocido (AGENTS.md).
- Escribir todo el código en inglés, con las tres excepciones de §11.1.
- Mantener la lógica en `src/lib/dictionary/` y que tanto la página como la API la consuman.
- Mantener `/diccionario/[lengua]` prerenderizable: la página no lee `searchParams`.
- Registrar licencia y atribución de cada fuente de contenido antes de importarla.
- `nvm use` antes de commitear.

**Preguntar primero**

- Modificar `header.tsx`, `layout.tsx` o `languages.ts` — fuera de alcance (decisión #4). El
  diccionario los **usa** vía `src/app/diccionario/layout.tsx`, sin editarlos.
- Tocar `resources.tsx` para algo que no sea el `href` de la tarjeta «Diccionario» (§6.5).
- Añadir cualquier dependencia que no sean las de test listadas en §10.
- Cambiar el nombre del parámetro `palabra` o la forma de la ruta.
- Meter datos de una fuente marcada `requiere-permiso`.
- Añadir renderizado dinámico o cache a la página del diccionario.

**Nunca**

- Copiar entradas de diccionario en bloque de una fuente con copyright sin permiso ni atribución.
- Suprimir errores de tipos o de lint (`any`, `@ts-ignore`, `eslint-disable`) para llegar a verde.
- Saltarse o borrar tests para que la suite pase.
- Inventar palabras, traducciones u oraciones de ejemplo en una lengua originaria. Si falta contenido,
  se deja el hueco y se dice; el dato falso es peor que la ausencia de dato.
- Refactorizar código ajeno al diccionario «de paso».
- Commitear con la suite roja.

---

## 14. Preguntas abiertas

Ninguna. Las cinco se cerraron:

| #   | Pregunta                   | Resolución                                                                                                                 |
| --- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1   | Orden alfabético asháninka | **Cerrada.** Confirmado que los dígrafos sí son letras propias. Implementado en `collation.ts` contra el alfabeto oficial. |
| 2   | Metadatos por palabra      | Decisión #8: título por lengua, estático.                                                                                  |
| 3   | Escala                     | Decisión #9. Medido en producción: 14 KB comprimidos frente al umbral de ~150 KB de §6.7.                                  |
| 4   | Audio                      | Fuera de alcance.                                                                                                          |
| 5   | Enlace desde el home       | Decisión #10, implementado.                                                                                                |

## 15. Aprobación

- [x] Mapa de capacidades (§3)
- [x] Modelo de datos (§4.1)
- [x] Contrato de URL y de API (§5.1, §6.1)
- [x] Código en inglés y sus excepciones (§11.1)
- [x] Límites (§13)
- [x] Alfabeto oficial y colación (§4.4)
- [x] Contenido real con atribución (§8)
