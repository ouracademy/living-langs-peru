# Plan de implementación — Página del pueblo Asháninka

> Spec: [specs/ashaninka.md](../../specs/ashaninka.md) · Fecha: 2026-09-14 · Rama base: `main`
> Lista de tareas ejecutable: [tasks/ashaninka/todo.md](./todo.md)

---

## 1. Cómo se corta el trabajo

El mapa `M1..M4` del spec (§3) dice **qué depende de qué**, no en qué orden se escribe. Tomado
literalmente daría un plan horizontal: primero toda la investigación de fuentes, después todo el JSON,
después toda la interfaz. Con eso no hay nada en pantalla hasta muy tarde, y el modelo de datos se
valida _después_ de haber escrito el contenido, que es justo cuando corregirlo es caro.

Este plan corta **vertical**: cada fase termina con `/ashaninka` funcionando y mostrando algo más que
antes. Las etiquetas `M1..M4` se conservan por tarea para rastrear la trazabilidad con el spec.

```
F0 fuentes mínimas ──> F1 «la página existe con cifras citadas»
                                    │
                       F2 notas al pie + validador  ← el invariante
                                    │
                       F3 historia y línea de tiempo
                                    │
                       F4 territorio y mapa      (puerta humana: cartografía)
                                    │
                       F5 galería de fotos       (puerta humana: licencias)
                                    │
                       F6 vida cotidiana, enlaces y contenido completo
                                    │
                       F7 accesibilidad, rendimiento y cierre
```

**Por qué M4 se parte y no va entero al principio.** El spec (§3) pone `content-sources` primero
porque es lo único que puede invalidar al resto. Cierto, pero no todo M4 tiene el mismo riesgo: la
BDPI es obra del Estado y está accesible hoy, mientras que la cartografía del mapa y la licencia de
cada foto son preguntas abiertas. Así que F0 registra sólo la **espina de fuentes** —las dos en uso,
la retirada de CARE, el 403 de Ethnologue— y cada investigación de licencia se hace **en la fase que
la consume**: la cartografía en F4, las fotos en F5. Una licencia que falla tumba su fase, no el plan.

**Por qué F1 lleva una sección y no las cuatro.** Descubrir que a `People` le falta un campo cuesta
poco con una sección escrita y mucho con todo el contenido dentro. El contenido crece a partir de F3,
cuando el esquema ya está probado contra una interfaz que lo consume.

**Por qué el validador cae en F2 y no al final.** `peoples:check` custodia el invariante del pedido:
**ningún párrafo sin fuente**. Si llega después de F3-F6, aparece cuando todo el contenido ya está
escrito y encuentra los errores tarde. Puesto en F2, cada fase de contenido nace vigilada.

**Por qué las fotos van en F5 y no antes.** Es la fase con más dependencia externa (verificar licencia
archivo por archivo en Commons) y la única cuyo fallo no rompe nada: la página funciona sin galería.

---

## 2. Decisiones de implementación

Las decisiones de producto están en el spec §2. Acá sólo lo que es puramente de ejecución.

| #   | Decisión                                                                                                                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **La página `async` no se testea con Vitest.** Igual que en el diccionario: Vitest no soporta Server Components asíncronos. Vitest cubre sólo `src/lib/peoples/`; la página se verifica con Playwright.                                           |
| D2  | **Tests primero en `format.ts`, `footnotes.ts` y `territory.ts`.** Son funciones puras con semántica falsable (§5.4 del spec). Es donde el TDD paga; en los componentes de presentación, no.                                                      |
| D3  | **El SVG del mapa entra como archivo estático simplificado**, no como GeoJSON convertido en runtime. Se reduce a los 25 departamentos con un `id` por cada uno y se versiona. Sin librería de mapas (decisión #9 del spec).                       |
| D4  | **Las fotos se descargan al repo.** `public/peoples/ashaninka/`. No se toca `images.remotePatterns` (spec §7.1): enlazar en caliente mete un punto de fallo y un rastreo de usuarios que la página no necesita.                                   |
| D5  | **`peoples:check` se engancha a `check:task`** junto a `dictionary:check` y `game:check`, no a `check:fast`. Es validación de datos, no de tipos: su lugar es el fin de tarea.                                                                    |
| D6  | **El stub de `/ashaninka` se reemplaza, no se envuelve.** Hoy son nueve líneas sin nada que conservar. `src/components/language.tsx` **no se toca**: el botón «Explorar Asháninka» ya apunta a `/ashaninka`.                                      |
| D7  | **La capa no busca por slug.** `/ashaninka` es una ruta estática sin segmento, así que el pueblo se importa directo (spec §5.2). Nada de `getPeople(slug): People \| null`: sería una rama muerta, no cubrible, que baja la cobertura del cambio. |

---

## 3. Fases

Cada tarea lleva: qué entrega, cómo se verifica, y qué criterios de aceptación del spec cierra.
`S` ≈ menos de media hora · `M` ≈ una a dos horas · `L` ≈ media jornada.

---

### F0 — Espina de fuentes

Necesariamente horizontal: es el registro de una decisión editorial, no producto. Es la única fase que
no deja nada visible, y es corta a propósito.

| Tarea | Entrega                                                                                                                                                                                                                 | Tam. | AC del spec               |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------- |
| T0.1  | `docs/ashaninka-sources.md` con el formato de `docs/dictionary-sources.md`: las dos fuentes en uso (BDPI, Ethnologue) con veredicto, el **403 de Ethnologue** y qué se decidió, y el pendiente de consulta comunitaria. | M    | AC-M4-1, AC-M4-3, AC-M4-4 |
| T0.2  | En el mismo documento: la **retirada de CARE** como fuente, con fecha (2026-09-14) y motivo, para que nadie la reintroduzca creyendo que fue un olvido.                                                                 | S    | AC-M4-5                   |

> ### ⛔ Checkpoint 0 — ¿alcanzan dos fuentes?
>
> Una persona lee el documento y confirma que BDPI + Ethnologue cubren historia, territorio, población
> y ficha lingüística sin huecos. Si falta algo, **se decide ahora** qué fuente entra, no a mitad de F3.

---

### F1 — La página existe con cifras citadas (corte vertical mínimo)

Primer recorrido completo: JSON → capa → Server Component → HTML. Contenido: el resumen, **una** sección
y las **cinco cifras**. Nada más.

| Tarea | Entrega                                                                                                                                                                                                                                     | Tam. | AC del spec                |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | -------------------------- |
| T1.1  | `src/lib/peoples/types.ts` según spec §5.1. `registry.ts` que exporta `ashaninka: People` (import estático, **sin lookup por slug** — spec §5.2). `src/data/peoples/ashaninka.json` con `summary`, `language`, las 5 `figures` y 1 sección. | M    | AC-M1-1, AC-M1-10          |
| T1.2  | `src/lib/peoples/format.ts`: `formatCount` (espacio duro, no separable) y `formatFigure` (pluraliza sin dejar «1 personas»). **Tests primero, en rojo** (D2).                                                                               | M    | AC-M1-2, AC-M1-3           |
| T1.3  | `src/app/ashaninka/page.tsx`: reemplaza el stub. `<PeopleHero>` + `<FigureGrid>`, `generateMetadata()` → «Pueblo Asháninka». Server Component, sin `"use client"`.                                                                          | M    | AC-M2-2, AC-M2-8, AC-M2-15 |
| T1.4  | E2E `tests/e2e/ashaninka.spec.ts`: desde `/`, clic en «Explorar Asháninka» → 200 · `<h1>` con «Asháninka» · **las tres cifras del censo visibles con etiquetas distintas** · el `<title>` correcto.                                         | M    | AC-M2-1, AC-M2-2, AC-M2-3  |
| T1.5  | Confirmar en `pnpm build` que `/ashaninka` sale **estática** (`○`), no `ƒ`.                                                                                                                                                                 | S    | AC-M2-12                   |

> ### ⛔ Checkpoint 1 · hito H1 — revisar el modelo `People` con ojo humano
>
> Antes de escribir contenido en volumen: ¿`Paragraph { text, sourceIds }` alcanza, o hacen falta
> subtítulos dentro de una sección? ¿`Figure` necesita un margen de error o un «aprox.»? ¿`timeline`
> necesita fechas ordenables o basta `period` como texto? Corregirlo acá cuesta una tarea; en F6, seis.

---

### F2 — Notas al pie y validador (el invariante)

El requisito explícito del pedido, y la guardia que protege todo lo que viene después.

| Tarea | Entrega                                                                                                                                                                                                                    | Tam. | AC del spec                        |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---------------------------------- |
| T2.1  | `src/lib/peoples/footnotes.ts`: `buildFootnotes` (numera en orden de render, una fuente = un número, ignora huérfanas) y `citationsFor` (ordenados, sin repetir). **Tests primero**, con fixture de los casos difíciles.   | M    | AC-M1-4, AC-M1-5, AC-M1-6, AC-M1-7 |
| T2.2  | `citation.tsx` y `footnotes.tsx`: `<sup>` con enlace `#nota-<n>` y texto accesible; `<ol>` con `<li id="nota-<n>">`, título, institución, enlace externo `rel="noopener noreferrer"` y «Consultado el …»; volver al texto. | M    | AC-M2-4, AC-M2-5, AC-M2-6          |
| T2.3  | «Datos actualizados al `<updatedAt>`» debajo de la lista. Es lo que sustituye al fetch en vivo (decisión #2): el lector ve la antigüedad del dato.                                                                         | S    | AC-M2-7                            |
| T2.4  | `scripts/validate-peoples.ts` con las siete reglas del spec §5.5 + script `peoples:check` + engancharlo a `check:task` (D5). Reporta **todos** los problemas, no sólo el primero.                                          | M    | AC-M1-8, AC-M1-9, AC-M1-13         |
| T2.5  | E2E: cada párrafo muestra marca de cita · clic salta a la nota · la nota vuelve al texto · **no** enlaza a careashaninka.org.pe.                                                                                           | M    | AC-M2-4, AC-M2-5, AC-M2-6          |

> ### ⛔ Checkpoint 2 — el pedido central
>
> Abrir `/ashaninka`, ver la cifra «118 277», seguir su nota al pie y aterrizar en la BDPI. Si eso
> funciona, la página ya cumple lo que se pidió: **datos con fuente visible**. Lo demás es contenido.

---

### F3 — Historia y línea de tiempo

| Tarea | Entrega                                                                                                                                                                                              | Tam. | AC del spec      |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---------------- |
| T3.1  | Contenido de la sección `historia` en el JSON: pre-colonial (Arawak, +3 000 años), colonial (franciscanos 1635, dominicos 1646), Juan Santos Atahualpa, caucho, conflicto armado. Todo parafraseado. | L    | AC-M4-2          |
| T3.2  | `people-section.tsx` y `timeline.tsx`: `<section aria-labelledby>`, `<h2>`, eventos como `<h3>` con su `period`. Ancla `#historia` estable.                                                          | M    | AC-M2-2          |
| T3.3  | Términos asháninka del contenido con `<i lang="cni">` (`pinkathari`, `sheripiari`, `kobintaantsi`, `intómoe`, `káapa`).                                                                              | S    | AC-M2-10 (apoyo) |
| T3.4  | E2E: la sección Historia es visible, `#historia` ancla, y la línea de tiempo muestra sus períodos.                                                                                                   | S    | AC-M2-2          |

> **Nota de redacción, no de código:** el conflicto armado interno se nombra con su cifra y su fuente
> (~10 000 desplazados, ~6 000 muertos, ~5 000 capturados), sin adjetivos añadidos. Spec §4.2.

---

### F4 — Territorio y mapa

| Tarea | Entrega                                                                                                                                                                | Tam. | AC del spec        |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------ |
| T4.1  | **Puerta humana H2.** Verificar una cartografía de departamentos del Perú con licencia libre (spec §4.3) y registrarla en `docs/ashaninka-sources.md` con autor y URL. | M    | AC-M4-6            |
| T4.2  | Contenido de la sección `territorio` + `territory` en el JSON: 6 regiones, 5 ríos principales, cuencas, estaciones seca y lluviosa.                                    | M    | AC-M4-2            |
| T4.3  | `src/lib/peoples/territory.ts`: `highlightedRegionIds` comparando normalizado («Junín» → `junin`). **Tests primero**, incluida la región que el SVG no tiene.          | M    | AC-M1-11, AC-M1-12 |
| T4.4  | Regla en `validate-peoples.ts`: toda región del JSON existe como `id` en el SVG. Falla si no.                                                                          | S    | AC-M1-12           |
| T4.5  | `territory-map.tsx`: SVG **inline**, `role="img"`, `<title>` que nombra las seis regiones, `<path>` decorativos con `aria-hidden`, seis regiones en `#E4572E`.         | L    | AC-M2-13           |
| T4.6  | **La lista de regiones y ríos en texto, debajo del mapa.** No es opcional: el mapa solo es ilegible para quien no lo ve y para quien no distingue esos dos colores.    | S    | AC-M2-14           |
| T4.7  | E2E: el mapa resalta seis regiones · el `<svg>` expone un `<title>` que las nombra · la misma información existe como texto.                                           | M    | AC-M2-13, AC-M2-14 |

> ### ⛔ Checkpoint 3 — ¿el mapa se entiende sin color?
>
> Abrir la página en escala de grises. Si el mapa deja de comunicar, la lista de texto de T4.6 tiene
> que estar cargando todo el peso, y tiene que bastar. Ese es el criterio, no el mapa bonito.

> **Salida si H2 falla:** si ninguna cartografía califica, **T4.5 no se hace** y F4 entrega el
> territorio en texto. El modelo de datos no cambia y el mapa se puede añadir después. Está previsto
> en el spec §4.3; no es una regresión ni una excepción que haya que justificar.

---

### F5 — Galería de fotos

| Tarea | Entrega                                                                                                                                                                       | Tam. | AC del spec               |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------- |
| T5.1  | **Puerta humana H3.** Verificar en Commons, **archivo por archivo**, autor y licencia de las candidatas del spec §7.1. Sólo entra CC BY / CC BY-SA / CC0 / dominio público.   | L    | AC-M3-5                   |
| T5.2  | Descargar las aprobadas a `public/peoples/ashaninka/` (D4) y cargarlas en `photos` del JSON con `width`, `height`, `alt` en español y `credit`.                               | M    | AC-M3-1, AC-M3-3, AC-M3-4 |
| T5.3  | Rastrear y clasificar las **4 imágenes preexistentes** de `public/` (`ash.jpg`, `ashb.jpg`, `ashaninka-c.webp`, `ashaninka-Mother-Baby.webp`) en `docs/ashaninka-sources.md`. | M    | AC-M3-6                   |
| T5.4  | `photo-gallery.tsx`: grilla responsive, `next/image` con `width`/`height` del JSON, **crédito visible** (autor · licencia, con enlace) debajo de cada foto. Sin lightbox.     | M    | AC-M3-2, AC-M3-7          |
| T5.5  | E2E: ≥4 fotos · cada una con autor y licencia visibles · ningún `alt` vacío ni genérico · sin layout shift.                                                                   | M    | AC-M3-1, AC-M3-2, AC-M3-3 |

> ### ⛔ Checkpoint 4 — ninguna foto sin licencia
>
> Cada imagen publicada tiene autor, licencia y URL en `docs/ashaninka-sources.md`. Si una no se pudo
> confirmar, **no está en la galería**. No se deja «para después con un TODO»: `check:floor` lo bloquea,
> y con razón.

> **Sobre las 4 preexistentes:** si su procedencia no se confirma, quedan registradas como deuda del
> home. Este trabajo **no** las quita de `hero.tsx` — es un cambio aparte, con su propia decisión.

---

### F6 — Vida cotidiana, enlaces y contenido completo

| Tarea | Entrega                                                                                                                                                                             | Tam. | AC del spec      |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---------------- |
| T6.1  | Contenido de la sección `vida`: organización social (`intómoe`/`káapa`, de parentelas a aldeas), economía (yuca, roza y quema, `kobintaantsi`, pesca), `pinkathari` y `sheripiari`. | L    | AC-M4-2          |
| T6.2  | `related-links.tsx`: enlace a `/diccionario/ashaninka` y a las fuentes externas. Conecta con el alfabeto de 19 grafías del spec del diccionario.                                    | S    | AC-M2-9          |
| T6.3  | Pasada de verificación factual: cada cifra del JSON contra la BDPI, una por una. **Puerta humana H4.**                                                                              | M    | AC-M4-2          |
| T6.4  | `pnpm peoples:check` en verde sobre el JSON completo, y rojo ante los cuatro fixtures rotos a propósito.                                                                            | S    | AC-M1-8, AC-M1-9 |

---

### F7 — Accesibilidad, rendimiento y cierre

La accesibilidad se implementa en cada tarea; esta fase la **audita**, que no es lo mismo.

| Tarea | Entrega                                                                                                                                         | Tam. | AC del spec        |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------ |
| T7.1  | Recorrido completo con teclado: cabecera → citas → notas al pie → volver al texto → enlaces externos → diccionario. E2E con sólo `keyboard`.    | M    | AC-M2-10           |
| T7.2  | Auditar contraste de todos los pares texto/fondo. `#F2B705` sobre claro **no** cumple AA en texto pequeño (spec §6.5): corregir donde aparezca. | M    | AC-M2-10           |
| T7.3  | Jerarquía de encabezados: un solo `<h1>`, secciones `<h2>`, eventos `<h3>`, sin saltos. Verificar con zoom al 200 %.                            | S    | AC-M2-10           |
| T7.4  | Confirmar **cero `"use client"`** en `src/components/peoples/**` y que `/ashaninka` sigue estática en `pnpm build`.                             | S    | AC-M2-12, AC-M2-15 |
| T7.5  | `git diff` contra `main`: no toca `header.tsx`, `layout.tsx`, `language.tsx` ni `src/app/diccionario/**`.                                       | S    | AC-M2-11           |
| T7.6  | Actualizar el estado del spec a `implementado` y anotar si el mapa quedó dentro o fuera (H2).                                                   | S    | —                  |

---

## 4. Hitos que requieren una persona

Ni la IA ni los tests pueden cerrar estos.

| id  | Hito                                                                                                      | Bloquea                                               |
| --- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| H1  | **Revisar el esquema `People`** en el checkpoint 1, antes de escribir contenido en volumen.               | F3 en adelante.                                       |
| H2  | **Aprobar la cartografía** con licencia libre para el mapa (T4.1).                                        | T4.5 (el SVG). **No** bloquea el resto de F4.         |
| H3  | **Aprobar la licencia de cada foto**, una por una (T5.1).                                                 | F5. **No** bloquea el resto de la página.             |
| H4  | **Verificación factual del contenido** contra la BDPI, incluida la redacción del conflicto armado (T6.3). | El cierre (F7.6).                                     |
| H5  | **Consulta a las organizaciones asháninka** sobre cómo se representa al pueblo.                           | **Nada** (decisión #11). Corre en paralelo; se anota. |

---

## 5. Commits

Un commit por tarea, [Conventional Commits](https://www.conventionalcommits.org/), sujeto en minúscula
e imperativo. `nvm use` antes de commitear (Node ≥ 22 para el hook de commitlint).

```
F0  docs: add ashaninka source and license research
F1  feat: add peoples data layer and types
    feat: add figure formatting helpers
    feat: replace ashaninka stub with people page
F2  feat: derive footnote numbering from cited sources
    feat: render citations and footnote list
    feat: add peoples validation script
F3  feat: add ashaninka history section and timeline
F4  feat: add ashaninka territory section
    feat: add static territory map
F5  feat: add ashaninka photo gallery with credits
    docs: document provenance of existing ashaninka images
F6  feat: add ashaninka daily life section
    feat: link ashaninka page to the dictionary
F7  fix: meet contrast requirements on the ashaninka page
    docs: mark ashaninka spec as implemented
```

---

## 6. Definición de terminado

Aplica a **cada** tarea, además de sus criterios de aceptación:

- `pnpm check:fast` limpio después de editar · `pnpm check:task` limpio al cerrar la tarea.
- `pnpm build` pasa y `/ashaninka` sigue saliendo **estática** (`○`) en la tabla de rutas.
- `pnpm test:e2e` pasa (desde F1 en adelante).
- Comportamiento verificado en un navegador real, no sólo en tests.
- **Cobertura ≥ 80 % de las líneas instrumentables tocadas.** Se cumple concentrando la lógica en
  `src/lib/peoples/`; los componentes de presentación se cubren por E2E.
- Todo identificador nuevo en inglés; el texto para personas, en español (`CONSTRAINTS.md`).
- **Cada párrafo y cada cifra con su `sourceId`.** `peoples:check` lo bloquea desde F2.
- Sin `any`, sin `@ts-ignore`, sin `eslint-disable`, sin tests saltados o borrados.
- Cero regresiones en `/`, `/diccionario/[lengua]`, `/juegos/completar-palabras/[lengua]` y `/lenguas/[slug]`.

---

## 7. Riesgos, ordenados por lo que costaría equivocarse

| Riesgo                                                                  | Impacto | Cuándo se detecta                           | Mitigación                                                                                    |
| ----------------------------------------------------------------------- | ------- | ------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Las tres cifras del censo se presentan como una sola                    | Alto    | T1.4 (E2E) y revisión humana                | AC-M2-3 lo prueba explícitamente; `note` obligatoria en las tres, exigida por `peoples:check` |
| Un dato del contenido no corresponde a lo que dice la fuente            | Alto    | Sólo lo detecta una persona (H4)            | `sourceId` obligatorio por párrafo desde F2; T6.3 revisa una por una                          |
| Se publica una foto sin licencia confirmada                             | Alto    | Checkpoint 4 (H3)                           | F5 al final; la página funciona sin galería. Sólo entra lo verificado                         |
| El esquema `People` resulta insuficiente al escribir contenido          | Medio   | Checkpoint 1 (H1), con 1 sección escrita    | Contenido en volumen recién desde F3                                                          |
| No hay cartografía con licencia libre usable                            | Medio   | T4.1 (H2)                                   | Salida escrita: el territorio queda en texto, el modelo de datos no cambia                    |
| Un componente introduce `"use client"` y la página deja de ser estática | Medio   | Cada `pnpm build` (definición de terminado) | T7.4 lo verifica explícito; el spec prohíbe interacción en el mapa                            |
| La numeración de notas se desincroniza del orden de render              | Medio   | T2.1 (tests primero)                        | `buildFootnotes` es pura y determinista; los números nunca se escriben a mano                 |
| CARE se reintroduce como fuente creyendo que fue un olvido              | Bajo    | T0.2 y AC-M1-13                             | La retirada queda escrita con fecha y motivo; el validador lo comprueba                       |
| El SVG del mapa pesa de más                                             | Bajo    | T4.5                                        | Se simplifica a 25 `<path>` con `id`; sin GeoJSON en runtime (D3)                             |
