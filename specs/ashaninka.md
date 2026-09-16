# Página del pueblo Asháninka

> Estado: **aprobado** · Fecha: 2026-09-11 · Aprobado: 2026-09-14 · Rama base: `main`
> Plan: [tasks/ashaninka/](../tasks/ashaninka/) · Índice: [specs/README.md](./README.md)
> Spec relacionado: [diccionario.md](./diccionario.md) (comparte `src/lib/languages.ts` y la política de fuentes)

---

## 1. Objetivo

Convertir `/ashaninka` —hoy un stub de cuatro líneas— en la página de entrada al mundo Asháninka:
quién es este pueblo, dónde vive, cuántos son, cómo llegó hasta aquí y cómo se ve. Es la página a la
que lleva el botón **«Explorar Asháninka»** del home.

Cada afirmación y cada cifra llevan **nota al pie con su fuente**. Esa es la restricción de diseño
central, no un adorno: es contenido sobre un pueblo indígena, y el valor de la página depende de que
se pueda rastrear de dónde salió cada dato.

**Usuarios objetivo**

| Usuario                   | Necesidad principal                                                              |
| ------------------------- | -------------------------------------------------------------------------------- |
| Escolar / público general | Entender en cinco minutos quién es el pueblo Asháninka y dónde vive.             |
| Docente de EIB            | Citar cifras confiables y enlazar la fuente oficial en clase.                    |
| Hablante / comunidad      | Verse representado con datos correctos y fotos con crédito, no con estereotipos. |
| Visitante del diccionario | Saltar del contexto cultural a la lengua y de vuelta.                            |

**Qué NO es este trabajo**

- **No** es un artículo enciclopédico exhaustivo. Es una página de entrada que resume y enlaza.
- **No** consume la web de Ethnologue en runtime (ver decisión #2 y §9.2). Devuelve HTTP 403.
- **No** toca `src/components/header.tsx`, `src/app/layout.tsx` ni las rutas del diccionario.
- **No** hay CMS, base de datos, autenticación ni panel de edición: el contenido se versiona en git.
- **No** incluye la página equivalente del pueblo Uro. La capa de datos queda lista para recibirla.
- **No** incluye mapa interactivo ni librería de mapas. El territorio lleva un **SVG estático** de las
  seis regiones (decisión #9): cero JavaScript, cero dependencias.
- **No** incluye audio de pronunciación (decisión #10).
- **No** usa CARE ni ninguna otra fuente fuera de las dos de §4.1 (decisión #11).

---

## 2. Decisiones tomadas

Cerradas con el equipo antes de escribir el spec. El resto de la especificación las asume.

| #   | Decisión            | Elección                                                                                                                                                                      |
| --- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Ruta                | **`/ashaninka`** se mantiene. El botón «Explorar Asháninka» de `language.tsx` ya apunta ahí y no se modifica.                                                                 |
| 2   | «Data dinámica»     | **JSON versionado con año del dato y fecha de consulta.** Sin fetch en runtime ni en build. La página es data-driven: cambia el JSON, cambia la página.                       |
| 3   | Alcance             | Página + **capa de datos tipada** en `src/lib/peoples/`. **Sin API pública** (`/api/pueblos/*` queda fuera; se puede añadir después sin tocar la capa).                       |
| 4   | Fotos               | Wikimedia Commons con licencia libre verificada, **más** documentar la procedencia de las 4 imágenes que ya viven en `public/`.                                               |
| 5   | Renderizado         | Server Component estático. **Cero `"use client"`** en toda la página (§6.7). Nada de lo que pide este spec lo necesita.                                                       |
| 6   | Idioma              | Código, nombres de archivo y **claves JSON en inglés**. Texto de la UI, `alt`, pies de foto, anclas de URL (`#historia`) y este spec, en español. Ver `CONSTRAINTS.md`.       |
| 7   | Notas al pie        | Numeración **derivada, no escrita a mano**: se calcula en orden de aparición. Escribir «³» en el contenido es un error que el tiempo rompe.                                   |
| 8   | Cifras de población | Se publican **las tres** del Censo 2017 por separado, con su etiqueta exacta. Ver §5.3: colapsarlas en «la población asháninka es X» sería un error factual.                  |
| 9   | Mapa del territorio | **SVG estático** del Perú con las seis regiones resaltadas, inline en el HTML. Sin librería de mapas, sin JS de cliente. Requiere cartografía con licencia libre (§4.3).      |
| 10  | Audio               | **Descartado**, igual que en [diccionario.md](./diccionario.md): no hay grabaciones con permiso de hablantes. Publicar audio sin consentimiento sería peor que no publicarlo. |
| 11  | Fuentes             | **Sólo BDPI (Ministerio de Cultura) y Ethnologue.** CARE queda fuera por decisión del equipo: las fuentes oficiales alcanzan. Ver §4.1.                                       |

---

## 3. Mapa de capacidades

Cuatro capacidades verificables por separado. Las flechas indican dependencia, **no orden de
escritura** — el orden de tareas corta vertical y vive en [tasks/ashaninka/plan.md](../tasks/ashaninka/plan.md).

```
M4 content-sources ──> M1 people-data ──┬──> M2 people-page
                                        │
                                        └──> M3 people-media
```

| id  | Módulo            | Entrega                                                                        | Depende de | Verificable por       |
| --- | ----------------- | ------------------------------------------------------------------------------ | ---------- | --------------------- |
| M4  | `content-sources` | Investigación de fuentes, licencias y redacción del contenido citado.          | —          | Revisión humana       |
| M1  | `people-data`     | Tipos, JSON, funciones puras (cifras, notas al pie) y script de validación.    | M4         | Vitest + CLI          |
| M2  | `people-page`     | Ruta `/ashaninka`: secciones, cifras, línea de tiempo, notas al pie, metadata. | M1         | Playwright            |
| M3  | `people-media`    | Galería de fotos con crédito y licencia visibles.                              | M1         | Playwright + revisión |

M4 va primero porque es la única capacidad cuyo resultado puede **invalidar** a las demás: si una
licencia no alcanza, cambia el contenido, no el código.

---

## 4. M4 — `content-sources`

Investigación editorial, no código de producto. Se entrega en `docs/ashaninka-sources.md` siguiendo
el formato ya establecido en [`docs/dictionary-sources.md`](../docs/dictionary-sources.md) (veredictos
`usable` / `solo-referencia` / `requiere-permiso` / `requiere-verificacion`).

### 4.1 Fuentes en uso

Dos, y sólo dos (decisión #11). Una tercera fuente provista al inicio del pedido —
[CARE, Central Asháninka del Río Ene](https://careashaninka.org.pe/) — **se retiró por decisión del
equipo**: las fuentes oficiales del Estado son suficientes para este contenido. La retirada se
registra en `docs/ashaninka-sources.md` para que la decisión no se pierda y para que nadie la
reintroduzca creyendo que fue un olvido.

| Fuente                                                                        | Rol en la página                                                              | Estado comprobado hoy                                                                                        |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [BDPI — Ministerio de Cultura](https://bdpi.cultura.gob.pe/pueblos/ashaninka) | **Fuente primaria.** Historia, territorio, población, organización, economía. | Accesible. Obra del Estado peruano; se cita y se enlaza. Se parafrasea, **no se copian párrafos literales**. |
| [Ethnologue `cni`](https://www.ethnologue.com/language/cni/)                  | Corroboración de la ficha lingüística.                                        | **HTTP 403 a cualquier fetch de servidor**, y contenido con licencia restrictiva. Ver §9.2.                  |

### 4.2 Reglas de redacción

- **Parafrasear, no transcribir.** Un dato («118 277 personas en 675 localidades») es un hecho y se
  cita. Un párrafo de la BDPI es texto con autor y no se copia.
- **Los términos asháninka se marcan con `lang`.** `pinkathari`, `sheripiari`, `kobintaantsi`,
  `intómoe` y `káapa` van en `<i lang="cni">`, igual que las oraciones de ejemplo
  del diccionario (§6.4 de [diccionario.md](./diccionario.md)).
- **El conflicto armado interno se nombra, no se estetiza.** La BDPI documenta ~10 000 desplazados,
  ~6 000 muertos y ~5 000 capturados por Sendero Luminoso entre 1980 y 2000. Es parte central de la
  historia reciente de este pueblo y se dice con la cifra y la fuente, sin adjetivos añadidos.
- **La capa que no es legal.** Vale lo mismo que en `docs/dictionary-sources.md`: el permiso de una
  institución no es el consentimiento de la comunidad sobre cómo se la representa. **No bloquea la
  publicación**: se construye con las fuentes oficiales citadas, y lo que llegue de las organizaciones
  asháninka se incorpora como corrección. Queda anotado en `docs/ashaninka-sources.md`.

### 4.3 Fuente cartográfica para el mapa

El SVG de la decisión #9 necesita contornos de los departamentos del Perú con licencia libre. Se
verifica antes de dibujar nada; si ninguna califica, el mapa no se hace y el territorio se queda en
texto (el modelo de datos no cambia en ninguno de los dos casos).

| Candidata                                                             | Licencia esperada          | A comprobar                                                   |
| --------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------- |
| Mapas SVG de divisiones administrativas del Perú en Wikimedia Commons | CC BY-SA / dominio público | Autor y licencia en la página del archivo, uno por uno.       |
| [Natural Earth](https://www.naturalearthdata.com/) admin-1            | Dominio público            | Es la opción más limpia legalmente; requiere convertir a SVG. |
| Shapefiles del INEI / plataforma de datos abiertos del Estado         | Datos abiertos del Estado  | Confirmar términos de uso; requiere conversión.               |

El SVG entra al repo como archivo estático simplificado, **no** se añade una librería de mapas ni una
dependencia de GeoJSON en runtime. La atribución del mapa va en las notas al pie como una fuente más.

### 4.4 Criterios de aceptación

- **AC-M4-1** Existe `docs/ashaninka-sources.md` con una fila por fuente: título, institución,
  licencia declarada, veredicto y si se comprobó o no.
- **AC-M4-2** Cada fuente usada en `ashaninka.json` tiene su fila en ese documento.
- **AC-M4-3** El documento registra explícitamente el 403 de Ethnologue y la decisión que se tomó.
- **AC-M4-4** El documento registra el pendiente de consulta a las organizaciones asháninka y que **no**
  bloquea la publicación.
- **AC-M4-5** El documento registra la retirada de CARE como fuente, con la fecha y el motivo.
- **AC-M4-6** La cartografía usada para el mapa tiene su fila con autor, licencia y URL, o el documento
  explica por qué no se hizo el mapa.

---

## 5. M1 — `people-data`

### 5.1 Modelo de datos

`src/lib/peoples/types.ts`

```ts
export type PeopleSlug = "ashaninka";

/** Id de una entrada de `sources` dentro del mismo pueblo. */
export type SourceId = string;

export type Source = {
  id: SourceId;
  title: string;
  publisher: string;
  url: string;
  year?: number; // año de publicación de la fuente
  retrievedAt: string; // ISO 8601 (YYYY-MM-DD): cuándo lo consultamos
  license?: string; // tal como la declara la fuente; ausente = no declarada
  note?: string;
};

export type FigureUnit = "people" | "speakers" | "localities" | "communities";

export type Figure = {
  id: string;
  label: string; // español, lo lee la gente: «Población en sus localidades»
  value: number;
  unit: FigureUnit;
  year?: number; // año al que corresponde el dato, no el de consulta
  sourceId: SourceId;
  note?: string; // matiz obligatorio cuando la cifra se puede malinterpretar
};

export type Paragraph = {
  text: string; // español
  sourceIds: SourceId[]; // al menos 1
};

export type PeopleSection = {
  id: string; // ancla de URL, en español: "historia", "territorio"
  title: string; // «Historia»
  paragraphs: Paragraph[];
};

export type TimelineEvent = {
  id: string;
  period: string; // «1742–1755», «1980–2000»
  title: string;
  text: string;
  sourceIds: SourceId[];
};

export type Territory = {
  regions: string[]; // Junín, Ucayali, Pasco, Cusco, Huánuco, Ayacucho
  rivers: string[]; // Pichis, Perené, Ene, Tambo, Ucayali
  basins: string[]; // Anacayali, Apurímac, Pachitea, Sheshea, Urubamba...
  sourceIds: SourceId[];
};

export type PhotoCredit = {
  author: string;
  license: string; // «CC BY-SA 4.0», «Dominio público»
  url: string; // página del archivo en su repositorio de origen
};

export type Photo = {
  src: string; // «/peoples/ashaninka/<archivo>»
  width: number;
  height: number;
  alt: string; // español, descriptivo; nunca vacío
  caption?: string; // español
  credit: PhotoCredit;
};

export type LanguageProfile = {
  family: string; // «Arawak»
  isoCodes: string[]; // ["cni", "prq"]
  letters: number; // 19, alfabeto normalizado
  sourceIds: SourceId[];
};

export type People = {
  slug: PeopleSlug;
  name: string; // «Asháninka»
  summary: string; // 2-3 oraciones, español
  language: LanguageProfile;
  figures: Figure[];
  sections: PeopleSection[];
  timeline: TimelineEvent[];
  territory: Territory;
  photos: Photo[];
  sources: Source[];
  updatedAt: string; // ISO 8601: última revisión del contenido
};
```

### 5.2 Archivos de datos

`src/data/peoples/ashaninka.json` es el **único** archivo de datos de este trabajo. No se crea ninguno
más, y la capa no busca por slug: **Asháninka es el único pueblo que esta página conoce.**

`src/lib/peoples/registry.ts` hace el import estático y la única aserción de tipo:

```ts
import ashaninkaJson from "@/data/peoples/ashaninka.json";
import type { People } from "./types";

// TypeScript ensancha los literales al importar JSON, así que la forma no se puede
// comprobar estructuralmente acá. `peoples:check` es lo que mantiene el archivo honesto.
export const ashaninka = ashaninkaJson as People;
```

**No se usa `fs` en runtime**, igual que `src/lib/dictionary/registry.ts`.

### La diferencia con el diccionario, y por qué importa

El diccionario expone `getDictionary(language: string): Dictionary | null`, y ahí está bien: su ruta es
`/diccionario/[lengua]`, con **segmento dinámico**, así que el slug llega de la URL y puede ser
cualquier cosa. `generateStaticParams` genera `uro`, que no tiene datos, y `/diccionario/klingon`
necesita un `notFound()`. La rama `null` se ejecuta de verdad.

Acá no. `/ashaninka` es una ruta **estática, sin segmento**: el slug nunca llega de afuera. Un
`getPeople(slug: string): People | null` obligaría a la página a escribir un `if (!people) notFound()`
que **ningún llamador puede alcanzar** — código muerto que además no se puede cubrir con tests y tira
hacia abajo la cobertura del cambio (≥ 80 %, `CONSTRAINTS.md`).

Cuando exista una página del pueblo Uro, esto vuelve a ser un registro con lookup. Hoy no, y copiar la
forma del diccionario «por si acaso» es inventar un caso que no existe.

### 5.3 La regla de las tres cifras (decisión #8)

El Censo 2017 produce tres números distintos sobre los asháninka y la BDPI los reporta por separado.
Presentarlos como uno solo es un error factual, y es el error más fácil de cometer en esta página:

| Figure `id`              | Etiqueta en la UI                 | Valor   | Qué mide                                                      |
| ------------------------ | --------------------------------- | ------- | ------------------------------------------------------------- |
| `population-localities`  | Población en sus localidades      | 118 277 | Personas que viven en las 675 localidades asháninka.          |
| `self-identified`        | Se autoidentifican como asháninka | 55 493  | Autoidentificación a nivel nacional, censo de población.      |
| `childhood-speakers`     | Aprendieron asháninka en la niñez | 73 567  | Lengua materna declarada. Es la cifra que reporta Ethnologue. |
| `localities`             | Localidades                       | 675     | Total de localidades del pueblo.                              |
| `recognized-communities` | Comunidades nativas reconocidas   | 405     | De las 675, las que tienen reconocimiento oficial.            |

Las tres primeras llevan `note` **obligatoria** que explica qué mide cada una. Las cinco salen de la
misma fuente y del mismo censo, así que la página no mezcla años ni metodologías.

### 5.4 API pública de la capa

`src/lib/peoples/index.ts`

```ts
export { ashaninka } from "./registry"; // el pueblo, ya tipado

getFigure(people: People, id: string): Figure | undefined;
```

No hay `getPeople(slug)`. Un pueblo que no existe **no es un caso de runtime, es un error de
compilación**: `import { uro }` simplemente no compila.

`src/lib/peoples/format.ts` (funciones puras, el corazón de los tests)

```ts
formatFigure(figure: Figure): string; // 118277 -> «118 277 personas»
formatCount(value: number): string; // separador de miles es-PE
```

`src/lib/peoples/territory.ts` (soporte del mapa, decisión #9)

```ts
/** Ids de los departamentos a resaltar, derivados de `territory.regions`. */
highlightedRegionIds(territory: Territory): string[];
```

El SVG trae un `<path id="...">` por departamento del Perú. La función compara los nombres de
`territory.regions` contra esos ids **normalizados** (minúsculas, sin tildes) y devuelve los que
coinciden. Así el mapa se pinta desde el JSON: si mañana la BDPI añade una región, se edita el dato y
el mapa cambia solo. Un nombre que no existe en el SVG es un error del dato y `peoples:check` lo
reporta (§5.5); **no** se ignora en silencio.

`src/lib/peoples/footnotes.ts` (la lógica no trivial, decisión #7)

```ts
type Footnote = { number: number; source: Source };

buildFootnotes(people: People): Footnote[];
citationsFor(footnotes: Footnote[], sourceIds: SourceId[]): number[];
```

**Semántica de `buildFootnotes`:**

- Recorre el contenido en **orden de render** — `summary` → `figures` → `sections` (en orden, y dentro
  de cada una los `paragraphs` en orden) → `timeline` → `territory` → `language` → `photos` — y asigna
  el número `1..N` la **primera** vez que aparece cada `sourceId`.
- Una fuente citada cinco veces tiene **un** número, no cinco.
- Una fuente declarada en `sources` pero nunca citada **no recibe número y no se lista**. El script de
  validación la reporta como fuente huérfana (§5.5).
- `citationsFor` devuelve los números en orden ascendente, deduplicados.

Esto es lo que hace que M1 sea testeable de verdad: la numeración es determinista y falsable.

### 5.5 Validación

`pnpm peoples:check` (`scripts/validate-peoples.ts`, mismo patrón que `validate-dictionary.ts`).
Falla con código de salida ≠ 0 y lista todos los problemas, no sólo el primero:

- Todo `sourceId` referenciado existe en `sources`.
- Toda `Source` tiene `retrievedAt` en formato `YYYY-MM-DD` válido.
- Toda `Source` declarada está citada al menos una vez (sin huérfanas).
- Todo `Paragraph` tiene `sourceIds` no vacío. **Ningún párrafo sin fuente.**
- Toda `Photo` tiene `alt` no vacío y `credit` con `author`, `license` y `url`.
- Todo `Figure.id` y `PeopleSection.id` es único.
- Las tres cifras de §5.3 tienen `note` no vacía.
- Toda región de `territory.regions` corresponde a un `id` del SVG del mapa (decisión #9).

Se engancha a `check:task` junto a `dictionary:check`.

### 5.6 Criterios de aceptación

- **AC-M1-1** `ashaninka` expone el pueblo completo: `summary`, `language`, las cinco `figures`, sus
  `sections` y sus `sources`. **No se testea ningún lookup por slug**: no existe (§5.2).
- **AC-M1-2** `formatCount(118277)` produce el número con separador de miles y **espacio duro**, no un
  espacio normal que pueda partir en dos líneas.
- **AC-M1-3** `formatFigure` usa la unidad correcta y pluraliza en español sin dejar «1 personas».
- **AC-M1-4** `buildFootnotes` numera en orden de aparición: la fuente citada primero es la 1.
- **AC-M1-5** Una fuente citada en tres lugares distintos aparece **una sola vez** en la lista.
- **AC-M1-6** Una fuente declarada y nunca citada **no** aparece en la lista de notas.
- **AC-M1-7** `citationsFor` devuelve los números ordenados y sin repetir ante ids duplicados.
- **AC-M1-8** `peoples:check` pasa sobre `ashaninka.json` real.
- **AC-M1-9** `peoples:check` falla ante un `sourceId` inexistente inyectado, ante un párrafo con
  `sourceIds: []`, y ante una foto sin `alt`.
- **AC-M1-10** Las tres cifras de §5.3 existen con sus valores exactos y su `note` no vacía.
- **AC-M1-11** `highlightedRegionIds` devuelve los seis ids resolviendo tildes y mayúsculas («Junín»
  → `junin`), y no devuelve nada para una región que el SVG no tiene.
- **AC-M1-12** `peoples:check` falla ante una región inexistente en el SVG.
- **AC-M1-13** Ninguna cifra ni fuente del JSON proviene de CARE (decisión #11).

---

## 6. M2 — `people-page`

### 6.1 Contrato de URL

| URL                   | Comportamiento                                                                    |
| --------------------- | --------------------------------------------------------------------------------- |
| `/ashaninka`          | La página completa. Estática (sin `searchParams`, sin datos remotos).             |
| `/ashaninka#historia` | Ancla directa a una sección. Toda sección de §6.2 tiene ancla estable en español. |
| `/lenguas/ashaninka`  | **Se deja como está.** Fuera de alcance. Ver la nota de §11.                      |

### 6.2 Estructura de la página

```
src/app/ashaninka/page.tsx                  Server Component, estático
  ├─ <PeopleHero people={...} />            nombre, resumen, foto de fondo, ficha de lengua
  ├─ <FigureGrid figures={...} />           las cifras de §5.3, con nota al pie cada una
  ├─ <PeopleSection id="historia" />        historia (párrafos + <Timeline />)
  ├─ <PeopleSection id="territorio" />      territorio y geografía + listas de regiones y ríos
  │    └─ <TerritoryMap territory={...} />  SVG estático, 6 regiones resaltadas
  ├─ <PeopleSection id="vida" />            organización social, economía, instituciones
  ├─ <PhotoGallery photos={...} />          M3
  ├─ <RelatedLinks />                       → /diccionario/ashaninka y fuentes externas
  └─ <Footnotes footnotes={...} />          lista numerada al final
```

Componentes en `src/components/peoples/`, kebab-case: `people-hero.tsx`, `figure-grid.tsx`,
`people-section.tsx`, `timeline.tsx`, `territory-map.tsx`, `photo-gallery.tsx`, `footnotes.tsx`,
`citation.tsx`.

`generateMetadata()` devuelve `title: "Pueblo Asháninka"`; el `template` de `layout.tsx` lo completa a
«Pueblo Asháninka | Lenguas originarias de Peru». La `description` sale de `people.summary`.

### 6.3 Notas al pie (el requisito explícito del pedido)

- En el cuerpo, cada párrafo, cifra y bloque citado termina con `<Citation>`: un `<sup>` con un enlace
  `#nota-<n>` por fuente. Renderizado: `¹ ²` → enlaces al pie.
- Al final, `<Footnotes>` renderiza `<ol>` con un `<li id="nota-<n>">` por fuente: título, institución,
  enlace externo (`target="_blank"`, `rel="noopener noreferrer"`) y **«Consultado el \<retrievedAt\>»**.
- Cada nota lleva un enlace de vuelta («↩ Volver al texto») al primer punto que la cita.
- Debajo de la lista: **«Datos actualizados al \<updatedAt\>»**. Eso es lo que sustituye al fetch en vivo
  (decisión #2): el lector ve la antigüedad del dato.
- Los números **no se escriben en el contenido**; salen de `buildFootnotes` (decisión #7).

### 6.4 El mapa del territorio (decisión #9)

- SVG **inline** en el Server Component, no `<img>`: así las regiones se pueden pintar con las clases
  de Tailwind y el mapa hereda el color de la página en vez de traer el suyo.
- Las seis regiones (Junín, Ucayali, Pasco, Cusco, Huánuco, Ayacucho) van en `#E4572E`; el resto del
  país, en un gris cálido de fondo. El contorno se mantiene visible en ambos.
- **El mapa no es la única forma de leer el dato.** Debajo va la lista de regiones y ríos en texto. Un
  mapa resaltado es inaccesible para quien no lo ve y para quien no distingue esos dos colores.
- El `<svg>` lleva `role="img"` y un `<title>` que nombra las seis regiones; los `<path>` decorativos
  van con `aria-hidden`.
- Sin interacción: ni hover, ni tooltip, ni zoom. Eso obligaría a `"use client"` y rompería §6.6.
- La atribución de la cartografía aparece como una nota al pie más.

### 6.5 Accesibilidad (obligatorio, no opcional)

Vale la misma barra que fijó §6.4 de [diccionario.md](./diccionario.md):

- Un solo `<h1>`; las secciones son `<h2>`, y los subtítulos de la línea de tiempo `<h3>`. Sin saltos.
- Cada sección es `<section aria-labelledby="...">` apuntando a su `<h2>`.
- Los `<sup>` de cita llevan texto accesible (`aria-label="Fuente 1"` o equivalente `sr-only`): un
  lector de pantalla no debe anunciar sólo «1».
- Las palabras asháninka van con `lang="cni"`.
- Contraste AA en todos los pares texto/fondo. Ojo con `#F2B705` sobre blanco: **no cumple AA** para
  texto pequeño; se usa como acento o sobre `#241D14`.
- El texto sobre la foto del hero necesita el overlay de gradiente que ya usa `hero.tsx`.
- La página es operable y legible con el zoom del navegador al 200 %.

### 6.6 Estilo visual

Reusa la paleta y las formas existentes: fondo `#FFF7E8`/`#FBEFD2`, acentos `#E4572E` (Asháninka, el
mismo de su tarjeta en el home), `#1B98A0`, `#F2B705`, `#6A3E8C`; texto `#241D14`, secundario
`#4A4130`; contenedor `max-w-[1180px] px-8`; radios grandes (`rounded-[28px]`) como en `language.tsx`.
Tipografía: Baloo 2 para títulos, Mulish para cuerpo (ya cargadas en `layout.tsx`).

### 6.7 Rendimiento

- Página estática. **Cero JavaScript de cliente añadido** salvo lo que Next ya envía.
- La foto del hero usa `priority`; las de la galería, `loading="lazy"` (default de `next/image`) y
  `sizes` correcto. Los `width`/`height` vienen del JSON, así que no hay layout shift.
- Guardarraíl: `/ashaninka` no debe superar el peso de JS de `/` (medible con `next build`).

### 6.8 Criterios de aceptación

- **AC-M2-1** Desde el home, hacer clic en **«Explorar Asháninka»** carga `/ashaninka` con estado 200.
- **AC-M2-2** La página muestra un `<h1>` con «Asháninka» y las secciones Historia, Territorio y
  Población visibles.
- **AC-M2-3** Las tres cifras de §5.3 se muestran con su etiqueta distinta y su nota aclaratoria; en
  ningún lugar de la página aparece una sola cifra presentada como «la población asháninka».
- **AC-M2-4** Cada párrafo del contenido muestra al menos una marca de cita.
- **AC-M2-5** Hacer clic en una marca de cita salta a la nota correspondiente al pie; la nota enlaza
  de vuelta al texto.
- **AC-M2-6** La lista de notas enlaza a bdpi.cultura.gob.pe y a ethnologue.com, cada una con su fecha
  de consulta. **No** enlaza a careashaninka.org.pe.
- **AC-M2-7** La página muestra «Datos actualizados al \<fecha\>».
- **AC-M2-8** El `<title>` contiene «Pueblo Asháninka».
- **AC-M2-9** La página lleva la cabecera y el pie del sitio y enlaza a `/diccionario/ashaninka`.
- **AC-M2-10** La página es recorrible sólo con teclado, incluidas las citas y los enlaces externos.
- **AC-M2-11** `git diff` no toca `header.tsx`, `layout.tsx` ni `src/app/diccionario/**`.
- **AC-M2-12** `next build` reporta `/ashaninka` como ruta estática (`○`), no dinámica.
- **AC-M2-13** El mapa resalta las seis regiones y el `<svg>` expone un `<title>` que las nombra.
- **AC-M2-14** La misma información del mapa está disponible como lista de texto.
- **AC-M2-15** La página no contiene la directiva `"use client"` en ningún componente.

---

## 7. M3 — `people-media`

### 7.1 Origen de las imágenes

Las fotos se **descargan al repo** (`public/peoples/ashaninka/`) y se sirven locales. No se configura
`images.remotePatterns`: enlazar en caliente a un host externo mete un punto de fallo y un rastreo de
usuarios que esta página no necesita.

Dos grupos:

**a) Wikimedia Commons.** Candidatas identificadas (la licencia de cada una **se verifica archivo por
archivo en la tarea, no se asume**):

| Archivo (Commons)                                                    | Por qué                                                  |
| -------------------------------------------------------------------- | -------------------------------------------------------- |
| `Asháninka Dance.jpg`                                                | Vida cultural contemporánea.                             |
| `Young Ashaninka girl in an Apiwtxa village, Acre state, Brazil.jpg` | El pueblo también vive en Brasil; amplía el territorio.  |
| `An Asháninka man, photographed by Charles Kroehle.jpg`              | Histórica (s. XIX). Probable dominio público.            |
| `An Asháninka settlement along the Palcazu River, circa 1888.png`    | Histórica, territorio.                                   |
| `Alphabet in Ashaninca.jpg`                                          | Puente hacia el diccionario y el alfabeto de 19 grafías. |

Regla de aceptación: **sólo entra un archivo cuya página en Commons declare CC BY, CC BY-SA, CC0 o
dominio público, con autor identificable.** Si la licencia no se puede confirmar, la foto no entra —
no se «deja para después con un TODO» (`check:floor` lo bloquea, y con razón).

**b) Las cuatro que ya están en `public/`.** `ash.jpg`, `ashb.jpg`, `ashaninka-c.webp`,
`ashaninka-Mother-Baby.webp` se usan hoy en el home **sin procedencia documentada**. La tarea las
rastrea y las clasifica en `docs/ashaninka-sources.md`:

- Procedencia y licencia confirmadas → se documentan y pueden usarse en la galería.
- No confirmadas → **no entran a la galería** y quedan registradas como deuda para el home. Este spec
  no las quita de `hero.tsx`: eso es un cambio aparte, con su propia decisión.

### 7.2 Presentación

- Grilla responsive (1 columna en móvil, 2-3 en escritorio) con `next/image` y `width`/`height` del JSON.
- **El crédito es visible, no un `title` escondido:** debajo de cada foto, autor · licencia, con enlace
  a la página del archivo.
- `alt` descriptivo en español, escrito para alguien que no ve la imagen. Nunca vacío, nunca «foto».
- Sin lightbox ni carrusel en v1: añadiría JS de cliente a una página que hoy no lo necesita.

### 7.3 Criterios de aceptación

- **AC-M3-1** La galería muestra al menos **4** fotos.
- **AC-M3-2** Cada foto muestra autor y licencia visibles, con enlace a su página de origen.
- **AC-M3-3** Ninguna imagen tiene `alt` vacío, y ningún `alt` es genérico («imagen», «foto»).
- **AC-M3-4** Todas las imágenes se sirven desde `public/`; `next.config.ts` no gana `remotePatterns`.
- **AC-M3-5** `docs/ashaninka-sources.md` tiene una fila por imagen usada, con su licencia y URL.
- **AC-M3-6** Las 4 imágenes preexistentes de `public/` están clasificadas en ese documento, aunque el
  veredicto sea «procedencia no determinada».
- **AC-M3-7** La galería no introduce layout shift (`width`/`height` presentes en todas).

---

## 8. Comandos

Los del repo, sin inventar ninguno. Node >= 22 (`nvm use`).

```bash
pnpm dev                # servidor de desarrollo
pnpm build              # build de producción
pnpm check:fast         # después de cada edición (~15 s)
pnpm check:task         # al terminar una tarea (~60 s)
pnpm check:full         # antes del PR; es lo que corre CI
pnpm test -- peoples    # sólo los tests de este trabajo
pnpm test:e2e -- ashaninka
```

**Este trabajo añade un comando:**

```bash
pnpm peoples:check      # node --experimental-strip-types scripts/validate-peoples.ts
```

y lo engancha dentro de `check:task`, al lado de `dictionary:check`.

---

## 9. Estructura y estilo

### 9.1 Archivos

```
src/app/ashaninka/page.tsx              Server Component (hoy es un stub de 9 líneas)
src/components/peoples/*.tsx            componentes de presentación, kebab-case
src/lib/peoples/types.ts                tipos
src/lib/peoples/registry.ts             import estático del JSON + aserción de tipo
src/lib/peoples/format.ts               formato de cifras (puro)
src/lib/peoples/footnotes.ts            numeración de notas (puro)
src/lib/peoples/territory.ts            regiones a resaltar en el mapa (puro)
src/lib/peoples/index.ts                API de la capa
src/data/peoples/ashaninka.json         el contenido
public/peoples/ashaninka/*              las fotos
src/components/peoples/territory-map.tsx  el SVG del mapa, inline
scripts/validate-peoples.ts             validador
docs/ashaninka-sources.md               fuentes, licencias y veredictos
tests/unit/peoples/*.test.ts            Vitest
tests/e2e/ashaninka.spec.ts             Playwright
```

### 9.2 La frontera con Ethnologue

Ethnologue devuelve **HTTP 403** a cualquier fetch de servidor y su contenido tiene licencia
restrictiva. La consecuencia práctica para el código:

```ts
// NO: falla en build, y el ToS de la fuente no lo permite.
const data = await fetch("https://www.ethnologue.com/language/cni/");

// SÍ: el dato vive en el JSON, con su año y su fecha de consulta,
// y Ethnologue se cita y se enlaza como fuente.
{
  "id": "childhood-speakers",
  "label": "Aprendieron asháninka en la niñez",
  "value": 73567,
  "unit": "speakers",
  "year": 2017,
  "sourceId": "ethnologue-cni",
  "note": "Misma cifra que reporta el Censo 2017 vía la BDPI."
}
```

Esto se escribe en `docs/ashaninka-sources.md` como decisión, no como excusa: si mañana Ethnologue
publica una API abierta, el cambio es reemplazar el origen del JSON, no rediseñar la página.

### 9.3 Estilo de código

Inglés en el código, español en lo que lee la gente (`CONSTRAINTS.md`). Los datos entran tipados y los
componentes sólo presentan:

```tsx
// src/components/peoples/figure-grid.tsx
import type { Figure } from "@/lib/peoples/types";
import { formatFigure } from "@/lib/peoples/format";

type FigureGridProps = {
  figures: Figure[];
  citationFor: (sourceId: string) => number;
};

export function FigureGrid({ figures, citationFor }: FigureGridProps) {
  return (
    <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {figures.map((figure) => (
        <div key={figure.id} className="rounded-[28px] bg-[#FBEFD2] p-7">
          <dt className="text-sm font-bold text-[#4A4130]">
            {figure.label}
            <Citation numbers={[citationFor(figure.sourceId)]} />
          </dt>
          <dd className="mt-2 text-4xl font-bold text-[#E4572E]">
            {formatFigure(figure)}
          </dd>
          {figure.note && (
            <p className="mt-2 text-sm text-[#4A4130]">{figure.note}</p>
          )}
        </div>
      ))}
    </dl>
  );
}
```

Tres cosas que muestra el ejemplo y que son la regla: tipos en inglés, copy en español, y **el
componente no sabe numerar notas** — recibe `citationFor`, que viene de la función pura testeada.

---

## 10. Estrategia de verificación

| Nivel     | Herramienta | Qué cubre                                                                     | Dónde vive                    |
| --------- | ----------- | ----------------------------------------------------------------------------- | ----------------------------- |
| Unitario  | Vitest      | `format.ts`, `footnotes.ts`, `territory.ts`, `index.ts`. Toda la lógica real. | `tests/unit/peoples/`         |
| Datos     | CLI         | `peoples:check` sobre el JSON real y sobre fixtures rotos a propósito.        | `scripts/`                    |
| E2E       | Playwright  | Navegación desde el home, secciones, notas al pie, galería, teclado.          | `tests/e2e/ashaninka.spec.ts` |
| Contenido | Humana      | Exactitud factual, licencias, tono. No se automatiza.                         | `docs/ashaninka-sources.md`   |

- **Cobertura ≥ 80 % de las líneas instrumentables tocadas** (`check:coverage`). Se cumple concentrando
  la lógica en funciones puras; los componentes de presentación se cubren por E2E.
- Los componentes que sólo mapean props a JSX **no** llevan test unitario. Un test que afirma que un
  `<div>` existe no prueba nada y sube el costo de cada cambio de diseño.
- El fixture de `footnotes.test.ts` se diseña para los casos difíciles: fuente repetida, fuente
  huérfana, ids duplicados en un mismo párrafo.

---

## 11. Límites

**Siempre**

- Cada párrafo y cada cifra con su `sourceId`. Sin excepción: `peoples:check` lo bloquea.
- `pnpm check:fast` después de editar; `pnpm check:task` al cerrar la tarea.
- Nombres de archivo en kebab-case; código en inglés; copy en español.
- Toda imagen con `alt` en español, `width`, `height` y crédito visible.
- Las cifras se citan tal como las reporta la fuente. Redondear o combinar cambia el hecho.

**Preguntar primero**

- Añadir una dependencia (hoy no hace falta ninguna).
- Cambiar `next.config.ts` (redirects, `remotePatterns`).
- Tocar el home más allá de lo que este spec dice (`language.tsx` **no** se toca: el botón ya apunta bien).
- Publicar una foto cuya licencia no se pudo confirmar.
- Ampliar el alcance a la página del pueblo Uro o a `/api/pueblos/*`.

**Nunca**

- Escribir un dato sin fuente, ni un número «aproximado» sin marcarlo como tal.
- Hacer scraping de Ethnologue (decisión #2).
- Copiar párrafos literales de la BDPI.
- Reintroducir CARE como fuente, o cualquier fuente fuera de §4.1, sin decidirlo antes (decisión #11).
- Añadir una librería de mapas, o hacer el mapa interactivo (decisión #9).
- Bajar un número de `CONSTRAINTS.md`, apagar un checker, o marcar un test `.skip` para pasar a verde.
- Presentar las tres cifras del Censo 2017 como si fueran una sola.
- Tocar `header.tsx`, `layout.tsx` o las rutas del diccionario.

> **Nota fuera de alcance, para que no se pierda:** `/lenguas/ashaninka` seguirá existiendo y
> renderizando sólo un `<h1>`, porque `generateStaticParams` la genera desde `languages.ts`. Queda una
> ruta duplicada y sin contenido. Consolidarla (o redirigirla a `/ashaninka`) es una decisión aparte,
> no un efecto colateral de este trabajo.

---

## 12. Preguntas cerradas

Las tres preguntas abiertas del borrador se respondieron el 2026-09-14 y pasaron a §2 como
decisiones. Se dejan acá con su respuesta para que la decisión tenga historia:

| #   | Pregunta                                   | Respuesta                                                                                | Dónde vive ahora         |
| --- | ------------------------------------------ | ---------------------------------------------------------------------------------------- | ------------------------ |
| 1   | ¿Mapa del territorio?                      | **Sí**, SVG estático de las seis regiones. Sin librería, sin interacción.                | Decisión #9, §4.3, §6.4  |
| 2   | ¿Audio de pronunciación?                   | **No.** Sin grabaciones con permiso, igual que en el diccionario.                        | Decisión #10, §1         |
| 3   | ¿La consulta a las organizaciones bloquea? | **No bloquea.** Y CARE se retira como fuente: las fuentes oficiales del Estado alcanzan. | Decisión #11, §4.1, §4.2 |

## 13. Preguntas abiertas

Ninguna. El spec está listo para pasar a plan.
