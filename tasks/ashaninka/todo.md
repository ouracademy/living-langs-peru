# TODO — Página del pueblo Asháninka

> Plan y razonamiento: [tasks/ashaninka/plan.md](./plan.md) · Spec: [specs/ashaninka.md](../../specs/ashaninka.md)
> Estado: **F0–F3 y F5 terminadas** (F5 el 2026-09-23). **F4 sigue pendiente** y es lo único que
> queda antes de F6: está bloqueada por la puerta humana H2 (cartografía con licencia libre).
>
> F5 se hizo fuera de orden, a pedido. No arrastró nada: la galería no toca el territorio ni el mapa,
> y el plan ya preveía que el fallo de una no bloquea a la otra.
>
> **Pendiente en F3 y F5:** los E2E de historia y de galería están escritos y verificados contra el
> HTML del build, pero **no se han corrido en un navegador**. Falta Chromium en la máquina:
> `sudo apt-get install -y libnspr4 libnss3 libasound2t64` y después `pnpm test:e2e`.

Cada tarea cierra cuando pasan sus criterios **y** la definición de terminado (plan §6):
`pnpm check:fast` · `pnpm check:task` · `pnpm build` con `/ashaninka` estática · `pnpm test:e2e` · verificado en navegador.

**Dos reglas que no se negocian en ninguna tarea:**

1. **Ningún párrafo ni cifra sin `sourceId`.** Desde T2.4, `peoples:check` lo bloquea.
2. **Todo identificador nuevo en inglés**; el texto que lee la gente, en español (`CONSTRAINTS.md`).

---

## F0 — Espina de fuentes

- [x] **T0.1** `docs/ashaninka-sources.md`: BDPI y Ethnologue con veredicto y licencia, el **403 de Ethnologue** y qué se decidió, el pendiente de consulta comunitaria (no bloqueante) `[AC-M4-1, AC-M4-3, AC-M4-4]`
- [x] **T0.2** En el mismo doc: la **retirada de CARE** con fecha 2026-09-14 y motivo `[AC-M4-5]`

> **⛔ Checkpoint 0** — una persona confirma que BDPI + Ethnologue cubren historia, territorio,
> población y ficha lingüística sin huecos. Si falta una fuente, se decide **ahora**, no en F3.

---

## F1 — La página existe con cifras citadas

- [x] **T1.1** `lib/peoples/types.ts` (spec §5.1), `registry.ts` que exporta `ashaninka: People` (**sin lookup por slug**, spec §5.2). `data/peoples/ashaninka.json` con `summary`, `language`, las **5 cifras** y **1 sección** `[AC-M1-1, AC-M1-10]`
- [x] **T1.2** `lib/peoples/format.ts`: `formatCount` (espacio duro) y `formatFigure` (sin «1 personas»). **Tests primero, en rojo** `[AC-M1-2, AC-M1-3]`
- [x] **T1.3** `app/ashaninka/page.tsx`: reemplaza el stub. `<PeopleHero>` + `<FigureGrid>`, `generateMetadata()` → «Pueblo Asháninka» `[AC-M2-2, AC-M2-8, AC-M2-15]`
- [x] **T1.4** E2E `tests/e2e/ashaninka.spec.ts`: home → «Explorar Asháninka» → 200 · `<h1>` · **las tres cifras del censo con etiquetas distintas** · `<title>` `[AC-M2-1, AC-M2-2, AC-M2-3]`
- [x] **T1.5** Confirmar en `pnpm build` que `/ashaninka` sale **estática** (`○`), no `ƒ` `[AC-M2-12]`

> **⛔ Checkpoint 1 · hito H1** — revisar `People` con ojo humano antes de escribir contenido en volumen.
> ¿`Paragraph { text, sourceIds }` alcanza o hacen falta subtítulos dentro de una sección?
> ¿`Figure` necesita margen de error o un «aprox.»? ¿`timeline` necesita fechas ordenables?

---

## F2 — Notas al pie y validador (el invariante)

- [x] **T2.1** `lib/peoples/footnotes.ts`: `buildFootnotes` (orden de render, una fuente = un número, ignora huérfanas) y `citationsFor`. **Tests primero**, fixture con fuente repetida, huérfana e ids duplicados `[AC-M1-4, AC-M1-5, AC-M1-6, AC-M1-7]`
- [x] **T2.2** `citation.tsx` + `footnotes.tsx`: `<sup>` con `#nota-<n>` y texto accesible; `<ol>` con `<li id="nota-<n>">`, institución, enlace `rel="noopener noreferrer"`, «Consultado el …», volver al texto `[AC-M2-4, AC-M2-5, AC-M2-6]`
- [x] **T2.3** «Datos actualizados al `<updatedAt>`» debajo de la lista `[AC-M2-7]`
- [x] **T2.4** `scripts/validate-peoples.ts` con las 7 reglas del spec §5.5 + script `peoples:check` + engancharlo a `check:task`. Reporta **todos** los problemas `[AC-M1-8, AC-M1-9, AC-M1-13]`
- [x] **T2.5** E2E: cada párrafo con marca de cita · clic salta a la nota · la nota vuelve · **no** enlaza a careashaninka.org.pe `[AC-M2-4, AC-M2-5, AC-M2-6]`

> **⛔ Checkpoint 2** — abrir `/ashaninka`, ver «118 277», seguir su nota al pie, aterrizar en la BDPI.
> Es el pedido central: datos con fuente visible. Lo demás es contenido.

---

## F3 — Historia y línea de tiempo

- [x] **T3.1** Contenido de `historia` en el JSON: Arawak (+3 000 años), franciscanos 1635 y dominicos 1646, Juan Santos Atahualpa 1742-1755, caucho y «correrías», conflicto armado 1980-2000. **Parafraseado, nunca copiado** `[AC-M4-2]`
- [x] **T3.2** `people-section.tsx` + `timeline.tsx`: `<section aria-labelledby>`, `<h2>`, eventos `<h3>` con su `period`, ancla `#historia` `[AC-M2-2]`
- [ ] **T3.3** → **movida a F6.** Términos asháninka con `<i lang="cni">`: `pinkathari`, `sheripiari`, `kobintaantsi`, `intómoe`, `káapa` `[AC-M2-10]`
- [x] **T3.4** E2E: sección Historia visible · `#historia` ancla · la línea de tiempo muestra sus períodos `[AC-M2-2]`

> **Por qué T3.3 se movió a F6** (2026-09-17). Los cinco términos que la tarea nombra no aparecen en
> el contenido de `historia` que escribió T3.1: los cinco son de la sección `vida`, que es T6.1.
> Construir acá el mecanismo de marcado sin una sola palabra que marcar sería la capa horizontal
> especulativa que este plan evita a propósito (plan §1), y dejaría código sin uso ni cobertura.
> El mecanismo se construye en F6, junto al contenido que lo estrena. AC-M2-10 lo cierra F7.

> El conflicto armado se nombra con su cifra y su fuente (~10 000 desplazados, ~6 000 muertos,
> ~5 000 capturados), sin adjetivos añadidos. Spec §4.2.

---

## F4 — Territorio y mapa

- [ ] **T4.1** **Puerta humana H2.** Verificar cartografía de departamentos del Perú con licencia libre (spec §4.3) y registrarla con autor y URL `[AC-M4-6]`
- [ ] **T4.2** Contenido de `territorio` + `territory` en el JSON: 6 regiones, 5 ríos, cuencas, estación seca (abr-oct) y lluviosa (dic-mar) `[AC-M4-2]`
- [ ] **T4.3** `lib/peoples/territory.ts`: `highlightedRegionIds` normalizando («Junín» → `junin`). **Tests primero**, incluida la región que el SVG no tiene `[AC-M1-11, AC-M1-12]`
- [ ] **T4.4** Regla en `validate-peoples.ts`: toda región del JSON existe como `id` del SVG `[AC-M1-12]`
- [ ] **T4.5** `territory-map.tsx`: SVG **inline**, `role="img"`, `<title>` que nombra las seis regiones, `<path>` decorativos con `aria-hidden`, regiones en `#E4572E` `[AC-M2-13]`
- [ ] **T4.6** **La lista de regiones y ríos en texto, debajo del mapa.** No es opcional `[AC-M2-14]`
- [ ] **T4.7** E2E: seis regiones resaltadas · `<title>` que las nombra · la misma información como texto `[AC-M2-13, AC-M2-14]`

> **⛔ Checkpoint 3** — abrir la página en escala de grises. Si el mapa deja de comunicar, la lista de
> texto de T4.6 tiene que bastar por sí sola. Ese es el criterio, no el mapa bonito.

> **Si H2 falla:** T4.5 no se hace, F4 entrega el territorio en texto y el mapa queda para después.
> Está previsto en el spec §4.3 — no es una regresión ni una excepción que haya que justificar.

---

## F5 — Galería de fotos

- [x] **T5.1** **Puerta humana H3.** Verificar en Commons, **archivo por archivo**, autor y licencia. Sólo entra CC BY / CC BY-SA / CC0 / dominio público `[AC-M3-5]`
- [x] **T5.2** Descargar las aprobadas a `public/peoples/ashaninka/` y cargarlas en `photos` con `width`, `height`, `alt` en español y `credit` `[AC-M3-1, AC-M3-3, AC-M3-4]`
- [x] **T5.3** Rastrear y clasificar las **4 preexistentes** (`ash.jpg`, `ashb.jpg`, `ashaninka-c.webp`, `ashaninka-Mother-Baby.webp`) en `docs/ashaninka-sources.md` `[AC-M3-6]`
- [x] **T5.4** `photo-gallery.tsx`: grilla responsive, `next/image` con `width`/`height`, **crédito visible** con enlace debajo de cada foto. Sin lightbox `[AC-M3-2, AC-M3-7]`
- [x] **T5.5** E2E: ≥4 fotos · autor y licencia visibles · ningún `alt` vacío ni genérico · sin layout shift `[AC-M3-1, AC-M3-2, AC-M3-3]`

> **⛔ Checkpoint 4** — cada imagen publicada tiene autor, licencia y URL en el doc de fuentes. Si una
> no se pudo confirmar, **no está en la galería**. No se deja «para después con un TODO».

> **Resultado de H3** (2026-09-23, detalle en `docs/ashaninka-sources.md` §7). Entraron **cinco**
> fotos, verificadas una por una contra la API de Commons. Dos cambios respecto de la lista del spec,
> ambos **revisables por el equipo**:
>
> - **Fuera** `Young Ashaninka girl in an Apiwtxa village…`. La licencia alcanza (CC BY 2.0), pero
>   Commons la marca con `Restrictions: personality` y la retratada es una niña identificable. La
>   licencia cubre el copyright del fotógrafo, no el consentimiento de la persona.
> - **Dentro**, en su lugar, una foto del CMP Flora Tristán que no estaba en el spec: contemporánea,
>   tomada en el Perú y no un retrato individual.
>
> `Asháninka Dance.jpg` lleva marca de agua del autor quemada en el píxel. Es legal; se ve.

> Si las 4 preexistentes no se confirman, quedan como deuda del home. Este trabajo **no** las quita de
> `hero.tsx`: es un cambio aparte, con su propia decisión.

---

## F6 — Vida cotidiana, enlaces y contenido completo

- [ ] **T6.1** Contenido de `vida`: `intómoe`/`káapa`, de parentelas de 30-50 a aldeas de 200-300, yuca y roza y quema, `kobintaantsi`, pesca con atarraya y barbasco, `pinkathari` y `sheripiari` `[AC-M4-2]`
- [ ] **T6.1b** (era T3.3) Mecanismo de marcado y los términos asháninka en `<i lang="cni">`. `Paragraph.text` es texto plano hoy: el marcado sale de datos, no de buscar palabras en la prosa. **Tests primero**, que es donde aplica D2 `[AC-M2-10]`
- [ ] **T6.2** `related-links.tsx`: enlace a `/diccionario/ashaninka` y a las fuentes externas `[AC-M2-9]`
- [ ] **T6.3** **Puerta humana H4.** Verificación factual: cada cifra del JSON contra la BDPI, una por una `[AC-M4-2]`
- [ ] **T6.4** `pnpm peoples:check` en verde sobre el JSON completo y **en rojo** ante los cuatro fixtures rotos a propósito `[AC-M1-8, AC-M1-9]`

---

## F7 — Accesibilidad, rendimiento y cierre

- [ ] **T7.1** Recorrido completo con teclado: cabecera → citas → notas → volver al texto → enlaces externos → diccionario. E2E con sólo `keyboard` `[AC-M2-10]`
- [ ] **T7.2** Auditar contraste. `#F2B705` sobre claro **no** cumple AA en texto pequeño: corregir donde aparezca `[AC-M2-10]`
- [ ] **T7.3** Jerarquía de encabezados sin saltos; verificar con zoom al 200 % `[AC-M2-10]`
- [ ] **T7.4** Confirmar **cero `"use client"`** en `components/peoples/**` y `/ashaninka` estática en `pnpm build` `[AC-M2-12, AC-M2-15]`
- [ ] **T7.5** `git diff` contra `main`: no toca `header.tsx`, `layout.tsx`, `language.tsx` ni `app/diccionario/**` `[AC-M2-11]`
- [ ] **T7.6** Estado del spec a `implementado`; anotar si el mapa quedó dentro o fuera (H2)

---

## Hitos humanos

| id  | Qué                                              | Bloquea                               |
| --- | ------------------------------------------------ | ------------------------------------- |
| H1  | Revisar el esquema `People` (checkpoint 1)       | F3 en adelante                        |
| H2  | Aprobar la cartografía con licencia libre (T4.1) | T4.5, no el resto de F4               |
| H3  | Aprobar la licencia de cada foto (T5.1)          | F5, no el resto de la página          |
| H4  | Verificación factual contra la BDPI (T6.3)       | El cierre (T7.6)                      |
| H5  | Consulta a las organizaciones asháninka          | **Nada.** Corre en paralelo (dec #11) |

---

## Cobertura de criterios de aceptación

Los 41 criterios del spec quedan cubiertos por alguna tarea. Los que sólo puede cerrar una persona
están marcados con su hito.

| Módulo | Criterios    | Fases        |
| ------ | ------------ | ------------ |
| M4     | AC-M4-1 … 6  | F0, F3-F6    |
| M1     | AC-M1-1 … 13 | F1, F2, F4   |
| M2     | AC-M2-1 … 15 | F1-F4, F6-F7 |
| M3     | AC-M3-1 … 7  | F5           |
