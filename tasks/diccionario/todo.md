# TODO — Diccionario

> Plan y razonamiento: [tasks/diccionario/plan.md](./plan.md) · Spec: [specs/diccionario.md](../../specs/diccionario.md)
> Estado: **pendiente de arrancar.** Ninguna tarea empezada.

Cada tarea cierra cuando pasan sus criterios **y** la definición de terminado (plan §6):
`pnpm test` · `pnpm lint` · `pnpm format:check` · `pnpm build` · `pnpm test:e2e` · verificado en navegador.

**Todo identificador nuevo va en inglés** (spec §11.1). Las tres excepciones: segmentos de ruta bajo
`src/app/`, el query param `palabra`, y el texto para personas.

---

## F0 — Andamiaje de pruebas

- [x] **T0.1** Vitest: deps, `vitest.config.mts` (`@vitejs/plugin-react`, `resolve.tsconfigPaths` nativo, `jsdom`), scripts `test` / `test:watch`
      → _verifica:_ `pnpm test` pasa y el alias `@/` resuelve en un test
- [x] **T0.2** Playwright: `@playwright/test`, `playwright.config.ts` con `webServer` = build+start, script `test:e2e`, smoke test de `/`
      → _verifica:_ `pnpm test:e2e` pasa contra la home actual

> **⛔ Checkpoint 0** — ambas suites en verde sobre el código existente, sin producto nuevo.

---

## F1 — Tres palabras en pantalla

- [x] **T1.1** `lib/dictionary/types.ts`, `registry.ts` (imports estáticos), `getDictionary()`, semilla `data/dictionary/ashaninka.json` con **3 entradas** (una con ejemplo) `[AC-M1-9 parcial]`
- [x] **T1.2** `app/diccionario/[lengua]/page.tsx`: Server Component, `generateStaticParams`, `generateMetadata` → «Diccionario Asháninka», `notFound()`. Lista plana. Redirect `/diccionario` en `next.config.ts`. Desestructurar `lengua` → `language` `[AC-M3-1, AC-M3-10]`
- [x] **T1.3** `components/resources.tsx`: `href` de la tarjeta «Diccionario» → `/diccionario/ashaninka`. Solo ese atributo `[AC-M3-11]`
- [x] **T1.4** E2E: redirect · 3 palabras visibles · `klingon` 404 · `uro` 404 · `<title>` correcto · el home lleva al diccionario `[AC-M1-9, AC-M3-1, AC-M3-10, AC-M3-11]`
- [x] **T1.5** Confirmar en `pnpm build` que `/diccionario/[lengua]` sale **estática**, no `ƒ`

> **⛔ Checkpoint 1 · hito H3** — revisar `Entry` con ojo humano antes de escribir contenido en volumen.
> ¿Falta algún campo que el asháninka necesite (tono, prefijos, forma poseída)?
> ¿`translations: string[]` basta o hacen falta acepciones numeradas?

---

## F2 — Detalle y enlace compartible

- [x] **T2.1** `lib/dictionary/text.ts`: `normalize` (preserva `ñ`), `slugify`, `compareWords`. **Tests primero, en rojo** `[AC-M1-1, AC-M1-2]`
- [x] **T2.2** `resolveWord()`: por `id`, luego por `word`/variante normalizada. Tests primero `[AC-M1-8]`
- [x] **T2.3** `components/dictionary/dictionary.tsx` (Client, en `<Suspense>`) + `entry-detail.tsx`: `useSearchParams`, `push`/`replace` con `{scroll:false}`, ejemplos con `lang="cni"`, mensaje si no hay ejemplos, aviso si `?palabra` no resuelve, botón copiar enlace `[AC-M3-4, AC-M3-6, AC-M3-7]`
- [x] **T2.4** E2E: clic cambia URL · deep-link directo abre la entrada · `?palabra=basura` avisa sin 404 · «atrás» funciona `[AC-M3-5, AC-M3-8]`
- [x] **T2.5** Reconfirmar que la ruta sigue estática tras meter `useSearchParams`

> **⛔ Checkpoint 2** — copiar la URL de una palabra, abrirla en otro navegador, ver la palabra con su
> ejemplo de uso. Es el pedido central; lo demás es comodidad.

---

## F3 — Orden alfabético y agrupado A-Z

- [x] **T3.1** `groupByLetter()` → `{ letter, entries }[]`: sin grupos vacíos, `Á` con `A`, grupo `#` final. Tests primero `[AC-M1-3]`
- [x] **T3.2** `entry-list.tsx`: secciones con encabezado sticky + índice A-Z clicable. Semilla a ~12 entradas `[AC-M3-2]`
- [x] **T3.3** E2E: lista ordenada y agrupada · el índice A-Z salta a la sección `[AC-M3-2]`

> ⚠️ **Hito H1 pendiente:** el orden usa `Intl.Collator("es")`. Si el asháninka trata `ch`/`sh`/`ts`/`ky`
> como letras propias, esto está mal. No cerrar F3 como correcta sin confirmación de un hablante.

---

## F4 — Buscador

- [x] **T4.1** `searchEntries()`: 5 niveles de ranking, bidireccional es→lengua. Tests primero, con fixture que distinga los 5 niveles `[AC-M1-4..7]`
- [x] **T4.2** `ui/input.tsx` vía shadcn + `search-box.tsx`: debounce ~150 ms, botón limpiar, `<label>`, contador en `aria-live="polite"`, estado local (no en URL) `[AC-M3-3]`
- [x] **T4.3** E2E: filtrar · contador · limpiar · buscar en español encuentra por traducción `[AC-M3-3, AC-M1-6]`

> **⛔ Checkpoint 3** — la página es usable de verdad. Buen momento para enseñársela a alguien de fuera.

---

## F5 — Selector de lengua

- [ ] **T5.1** `getLanguagesWithDictionary()`. Tests: incluye `ashaninka`, excluye `uro` `[AC-M1-9]`
- [ ] **T5.2** `language-picker.tsx` con `dropdown-menu`: lenguas sin diccionario deshabilitadas con «pronto», cambiar descarta `?palabra` y la búsqueda, muestra lengua activa y total `[AC-M4-1..3]`
- [ ] **T5.3** E2E: lengua activa · Uro deshabilitado · cambio descarta `?palabra` · teclado `[AC-M4-1..4]`
- [ ] **T5.4** Verificar que el diff no toca `header.tsx`, `layout.tsx` ni `language.tsx` `[AC-M4-5]`

---

## F6 — Validador y API

- [ ] **T6.1** `scripts/validate-dictionary.ts` + script `dictionary:check`. Sale con código ≠ 0 y lista errores `[AC-M1-10]`
- [ ] **T6.2** `GET /api/diccionario` con `dynamic = "force-static"` `[AC-M2-1]`
- [ ] **T6.3** `GET /api/diccionario/[lengua]` con `q` / `limit` (máx 500) / `offset`; `400 invalid_parameter` `[AC-M2-2..5]`
- [ ] **T6.4** `GET /api/diccionario/[lengua]/[id]` → entrada o `404 entry_not_found` `[AC-M2-6]`
- [ ] **T6.5** Tests Vitest de handlers con `Request` a mano; incluye `405` en `POST` `[AC-M2-1..7]`

---

## F7 — Fuentes y contenido real _(tiene puerta humana)_

- [ ] **T7.1** `docs/dictionary-sources.md`: fuentes con institución, URL, licencia, veredicto, cobertura, ortografía. **Solo investigación, cero importación** `[AC-M5-1]`
- [ ] **T7.2** 🚦 **HITO H2 — decisión humana.** Aprobar veredictos; pedir permisos donde haga falta y registrar respuestas `[AC-M5-2]`
- [ ] **T7.3** `data/dictionary/sources.json` + atribución visible en la interfaz (página y detalle de entrada) `[AC-M5-3, AC-M5-4]`
- [ ] **T7.4** `scripts/import-dictionary.ts`, idempotente, corre `dictionary:check` `[AC-M5-5]`
- [ ] **T7.5** Crecer `ashaninka.json` a 30–40 entradas, ≥10 con ejemplos, todas con `sourceId` `[AC-M5-2, AC-M5-3]`
- [ ] **T7.6** Medir el payload RSC contra el umbral de spec §6.7 (~150 KB comprimidos); si lo supera, índice ligero + detalle vía la API de F6

> **⛔ Checkpoint 4** — toda entrada con fuente citada y licencia registrada. Nada inventado.

---

## F8 — Accesibilidad y cierre

- [ ] **T8.1** E2E de recorrido completo solo con teclado: buscar → lista → detalle → copiar → cambiar lengua `[AC-M3-9]`
- [ ] **T8.2** Auditar contraste; corregir `#F2B705` sobre claro donde se use en texto pequeño `[AC-M3-9]`
- [ ] **T8.3** Responsive: hoja inferior en móvil, dos columnas en escritorio. Verificar a 375 px y 1280 px
- [ ] **T8.4** Spec a `implementado`; anotar si la pregunta abierta #1 sigue abierta

---

## Hitos humanos (no los cierra ni la IA ni los tests)

- [ ] **H1** Confirmar orden alfabético asháninka con hablante o lingüista → cierra F3
- [ ] **H2** Aprobar licencias de fuentes y conseguir permisos → desbloquea T7.3
- [ ] **H3** Revisar el esquema `Entry` en el checkpoint 1 → desbloquea F7
