# TODO — Saltapalabras

> Plan y razonamiento: [tasks/saltapalabras/plan.md](./plan.md) · Spec: [specs/saltapalabras.md](../../specs/saltapalabras.md)
> Estado: **F0, F1a y F1b hechas y commiteadas (2026-11-18). F2 hecha (2026-11-18) en la rama `integracion`, sin commit.** F3 en adelante, sin empezar. El spec sigue en `borrador`.

Cada tarea cierra cuando pasan sus criterios **y** la definición de terminado (plan §6):
`pnpm check:fast` · `pnpm check:task` · commit propio.

**Reglas que no se negocian en ninguna tarea:**

1. **El juego es libre de login.** Nada en `/juegos/saltapalabras/**` pide, ofrece ni enlaza un
   ingreso ni `/admin` (decisión #18).
2. **El navegador de quien juega nunca habla con la API de datos de Supabase.** Solo el servidor, con
   la `service_role`, que nunca va en una variable `NEXT_PUBLIC_` (decisión #3).
3. **Nunca inventar ni generar con IA palabras, traducciones, frases ni grabaciones en una lengua
   originaria.** Los fixtures usan palabras marcadas «PRUEBA» (spec §13).
4. **Nunca publicar un paquete de prueba en Supabase real**: Preview comparte la base con producción
   (plan §4). Las pruebas de publicación van contra el Supabase falso.
5. **Nada sin verificar llega a una ruta pública**: todo pasa por `playableThemes` (decisión #4).
6. **Identificadores en inglés**, texto para personas en español. Pedir visto bueno antes de agregar
   una dependencia (spec §13); este plan no agrega ninguna.

Rama: `feat/saltapalabras` desde `main`. `src/proxy.ts` y `src/lib/admin/basic-auth.ts` son de
edicion-fotos: se reusan, no se reescriben (plan §2).

---

## F0 — Verificaciones que pueden cambiar el diseño

Con rutas y scripts descartables; **nada de F0 se commitea** salvo las notas en el plan y el SQL
corregido.

- [x] **T0.1** (S) Ruta de prueba `[slug]` con `generateStaticParams → []` y `revalidate = 3600`. Anotar en plan §3.1 qué marca muestra la tabla de `pnpm build` y confirmar que la primera visita genera y la segunda sirve de caché `[AC-SP4-1]`
  - Hecho: `●` (SSG) sin rutas listadas; MISS en la primera visita, HIT después. Resultados en plan §3.1.
- [x] **T0.2** (S) En la misma ruta, un Route Handler que llama `revalidateTag(tag, "max")` + `revalidatePath(path)`: confirmar que invalida la entrada de `unstable_cache` y la página, y que como tarde la segunda visita ve el dato nuevo `[AC-SP6-11]`
  - Hecho, con cambio de diseño: `revalidateTag(tag, "max")` **solo** cumple AC-SP6-11; `revalidatePath` se descarta (ver T0.3). Spec §6.4 corregida.
- [x] **T0.3** (M) Función cacheada con `unstable_cache` que **lanza** a demanda: (a) tras una lectura buena, una revalidación que lanza deja la página buena; (b) un error en la primera visita no queda en caché y la siguiente reintenta. Anotar resultado `[AC-SP3-7, AC-SP3-11, AC-SP4-8]`
  - Hecho: por tiempo y por `revalidateTag` solo, una revalidación que falla deja la página buena; con `revalidatePath`, 500. El error de la primera visita no se cachea.
- [x] **T0.4** (S) Definir el chequeo del bundle de plan §3.6 (qué patrones, qué carpeta) y probarlo contra un build donde a propósito se filtra una URL, para ver que falla `[AC-SP3-12]`
  - Hecho: `tests/e2e/bundle-leaks.ts`. Desvío: la fuga se probó plantando un archivo en una copia de `.next/static`, no con un segundo build.
- [x] **T0.5** (M) Prototipo de `tests/e2e/fake-supabase.mjs` (`node:http`) y `playwright.config.ts` con dos `webServer`: copiar la petición real que hace `supabase-js` para `.from("language_packs").select(…).eq(…).maybeSingle()` (ruta, `Accept`, respuesta vacía) e imitarla. Correr **toda** la suite e2e existente: debe seguir verde. Si la revisión lo considera «cambiar CI», preguntar (spec §13) `[AC-SP4-2]`
  - Hecho: petición real capturada (GET con arreglo JSON). Suite e2e completa en verde con los dos `webServer` (116/116, puerto 3200 con config temporal). Una corrida tuvo un fallo intermitente en `word-game.spec.ts` («three mistakes») que pasó en 3 corridas posteriores. Pregunta abierta: ¿cambiar `playwright.config.ts` cuenta como «cambiar CI»?
- [x] **T0.6** (M) Postgres 16 local con roles `anon`, `authenticated`, `service_role`: correr el SQL de spec §6.1–§6.2 tal cual y comprobar que `publish_language_pack` **falla** con los `grant` del spec; aplicar los de plan §3.4 y comprobar que publica, que `anon`/`authenticated` no leen ni ejecutan y que `pack_versions` no admite `update`/`delete` `[AC-SP3-1, AC-SP3-2, AC-SP3-3]`
  - Hecho en Postgres **18.3** local (no había 16). Con los `grant` del spec: «permiso denegado». Con los de plan §3.4, el test pasa; con una tabla abierta a `anon`, falla.

> **⛔ Checkpoint 0** — los seis hallazgos están anotados en plan §3.1 y el SQL corregido está listo
> para H1. Si algún hallazgo contradice el spec, se actualiza el spec antes de F1a.

## H1 — Tablas en Supabase (humano)

- [ ] **H1.1** Pegar el bloque SP3 de `docs/saltapalabras-schema.sql` (escrito en T1.7, con los `grant` corregidos) en el _SQL Editor_. Anotar la fecha en el archivo.
- [ ] **H1.2** En el panel: las tablas tienen RLS activado y **ninguna** política; `solicitudes` sigue igual `[AC-SP3-9]`

## H3 — Primer paquete asháninka (humano, en paralelo desde F1a)

- [ ] **H3.1** El equipo arma el paquete a partir del vocabulario MINEDU ya citado en el diccionario, con emojis elegidos por el equipo (spec pregunta 6).
- [ ] **H3.2** Una persona hablante, o la fuente citada, verifica cada ítem antes de marcar `verified: true`. **Ninguna palabra inventada ni generada con IA.**
- [ ] **H3.3** Se publica en Supabase real **solo** cuando está verificado: con la función desde el _SQL Editor_ (F1) o desde `/admin/juego` (F2).

---

## F1a — Una ronda `pic2word` de punta a punta (SP1, SP2, SP3, SP4)

- [x] **T1.1** (M) `src/lib/language-packs/types.ts` + `schema.ts` (Zod) + `parsePack`. **Tests primero** con fixtures «PRUEBA» `[AC-SP1-1, AC-SP1-10]`
- [x] **T1.2** (M) `clean.ts`: `cleanPack` (recorte, ids estables, deduplicado, NFC). **Tests primero** `[AC-SP1-2, AC-SP1-3, AC-SP1-9]`
  - Desvío: «sin `word` ni `translation`» se leyó literal (se quita si faltan **las dos**); un ítem al que le falta una sola no llega al juego porque `playableThemes` exige las dos.
- [x] **T1.3** (M) `playable.ts`: `playableThemes` con los mínimos de spec §4.3 solo para `pic2word` por ahora; los demás modos devuelven «no jugable» hasta F1b. **Tests primero** `[AC-SP1-4, AC-SP1-5]`
  - Además exige `word` y `translation` no vacías. Los modos distintos de `pic2word` devuelven «no jugable» hasta F1b/F3.
- [x] **T1.4** (M) `src/lib/word-jump/constants.ts` + `questions.ts` (solo `pic2word`) reusando `mulberry32`/`shuffle`. **Tests primero** `[AC-SP2-1, AC-SP2-2, AC-SP2-3, AC-SP2-9]`
  - Desvío de firma: `buildQuestion(item, theme, playable, random)` recibe `playableThemes(pack)` en vez del paquete, para que los distractores solo puedan salir de ítems jugables (AC-SP2-3).
- [x] **T1.5** (M) `round.ts`: `buildRound` y el reducer (acierto, error con reencolado ≤ 2, feedback, resumen). **Tests primero** `[AC-SP2-6, AC-SP2-7, AC-SP2-8]`
- [x] **T1.6** (S) `stats.ts`: `ItemStats` y su actualización al cerrar una ronda. **Tests primero** `[AC-SP2-8]`
- [x] **T1.7** (M) `docs/saltapalabras-schema.sql` bloque SP3 (tablas, restricciones, vista `pack_words`, función, `grant` de plan §3.4) + `docs/saltapalabras-schema.test.sql`. Correr el test SQL en Postgres local y anotar la fecha en `docs/saltapalabras-pruebas.md`. Actualizar spec §6.1 con los `grant` correctos `[AC-SP3-1 … AC-SP3-6]`
  - Hecho: `docs/saltapalabras-schema.sql` + `.test.sql`, registro en `docs/saltapalabras-pruebas.md`, spec §6.1 actualizada. Desvío: el límite de 2 MB usa `octet_length(pack::text)` en vez de `pg_column_size` (este mide el valor comprimido). `p_expected_version = 0` significa «sin versión publicada».
- [x] **T1.8** (M) `src/lib/language-packs/library.ts` (`server-only`): `readPublishedPack` con cliente inyectado (`unconfigured` sin variables, `none`, `ok`; **lanza** ante error o respuesta malformada) y `getPublishedPack` con `unstable_cache` (`word-jump-pack:<lengua>`, `revalidate: 3600`). **Tests primero** con cliente simulado `[AC-SP3-7, AC-SP3-8, AC-SP3-11]`
  - `PackReadResult` vive en `types.ts` para que `game-state.ts` lo use sin importar el módulo `server-only`. `getPackClient()` comprueba las variables antes de `getSupabaseAdmin()`.
- [x] **T1.9** (M) `tests/e2e/fake-supabase.mjs` y fixtures «PRUEBA» en `tests/e2e/fixtures/`; `playwright.config.ts` con los dos `webServer` (de T0.5). La suite existente sigue verde `[AC-SP4-2]`
- [x] **T1.10** (M) `src/app/juegos/saltapalabras/page.tsx` (biblioteca estática desde `languages.ts`, sin leer la base) y `[lengua]/page.tsx` (servidor: `generateStaticParams → []`, `revalidate = 3600`, `notFound()` fuera de `languages.ts`, uro sin consultar la base, `resolveGameState` puro con tests) + `[lengua]/error.tsx` (cliente, «El juego no está disponible ahora» con enlace a completar-palabras). Anotar en spec §11.3 la excepción de `error.tsx` `[AC-SP4-1, AC-SP4-8, AC-SP4-9, AC-SP4-10]`
  - Hecho, con `resolveGameState` en `src/lib/word-jump/game-state.ts` y uro en `src/lib/word-jump/availability.ts`. Excepción de `error.tsx` anotada en spec §11.3.
- [x] **T1.11** (L) `src/components/word-jump/`: inicio de lengua, ronda con canvas decorativo (`aria-hidden`) y tres `<button>`, feedback con fuente, resumen. Solo `pic2word`. Lógica del salto en funciones puras con tests `[AC-SP4-3, AC-SP4-4, AC-SP4-11]`
  - Hecho para `pic2word`: inicio, ronda (canvas `aria-hidden` + tres `<button lang>`), feedback con fuente en `role="status"`, resumen. Geometría en `src/lib/word-jump/jump.ts` con tests. Ya respeta `prefers-reduced-motion` (sin animar). Atajos 1/2/3, foco a «Seguir» y el resto de T1.18 quedan para F1b.
- [x] **T1.12** (S) `pnpm build` **sin** `.env.local` ni variables de Supabase: termina bien, sin peticiones a Supabase; tabla de rutas según T0.1 `[AC-SP3-10, AC-SP4-1]`
  - Hecho sin variables: `/juegos/saltapalabras` `○`, `[lengua]` `●` sin rutas. Requirió fijar `turbopack.root` (plan §3.1, hallazgo del worktree).
- [x] **T1.13** (M) `tests/e2e/word-jump.spec.ts`: biblioteca → ashaninka → tema → ronda `pic2word` completa → resumen; ítem sin verificar del fixture nunca aparece; ninguna ruta del recorrido da 401 ni enlaza a `/admin` o a un ingreso; el navegador no pide `/rest/v1` ni `/auth/v1`; chequeo del bundle (plan §3.6) `[AC-SP4-2, AC-SP4-3, AC-SP4-12, AC-SP4-13, AC-SP3-12]`
  - Hecho: recorrido completo, ítem sin verificar nunca visible, sin 401 ni enlaces a `/admin`, el navegador no pide `/rest/v1`, `/auth/v1` ni al falso, y bundle limpio.

> **⛔ Checkpoint 1a** — con el Supabase falso se juega una ronda entera sin login, y el build no
> depende de Supabase. Se puede mergear aunque H3 no esté listo: sin paquete, la página dice «aún no
> disponible».

## F1b — Los modos sin audio, progreso y accesibilidad (SP1, SP2, SP4)

- [x] **T1.14** (M) `graphemes.ts`: `tokenizeGraphemes`. **Tests primero** `[AC-SP1-8]`
  - Hecho. Además `initialGrapheme` y `vowelSlots` (los usan `playable`, `questions` y `validate`). La coincidencia ignora mayúsculas y los tokens conservan la escritura de la palabra, para que la palabra con hueco se lea como fue escrita.
- [x] **T1.15** (M) `questions.ts` + `playable.ts`: modos `word2pic`, `first` (con `confusable`) y `vowel` (con `vowelVariants`) y sus mínimos. **Tests primero** `[AC-SP2-1, AC-SP2-2, AC-SP2-4, AC-SP2-5]`
  - Hecho. Desvíos: `buildQuestion` recibe las reglas de la lengua como 5.º argumento opcional (`RoundContext.rules`), y `PublicPack.language` ahora lleva `graphemes`, `vowels`, `vowelVariants` y `confusable`. El modo `vowel` exige además **dos vocales** en la lengua (una sola no es una elección; no está en spec §4.3). `listen` sigue sin jugarse hasta F3. Las opciones pasan a `{ text, itemId?, label? }`.
- [x] **T1.16** (M) `validate.ts`: `validatePack(pack, { audioBaseUrl })` con errores y avisos de spec §4.3. **Tests primero** `[AC-SP1-6, AC-SP1-7]`
  - Hecho, con `language` opcional para `language_mismatch`. Desvío: los problemas del paquete entero (lengua, tamaño) no llevan `themeId` (spec §4.2 dice que cada `Issue` lo lleva). El audio exige `audioBaseUrl` + `/`, para no aceptar un bucket que solo empieza igual.
- [x] **T1.17** (M) `progress.ts` + `progress-store.ts` (`living-langs:word-jump:v1`, `useSyncExternalStore`, valor validado al leer, juego jugable si `localStorage` falla), siguiendo `src/lib/game/progress-store.ts` `[AC-SP4-7]`
  - Hecho. Reusa `defaultStorage` y `canPersist` de `src/lib/game/progress.ts` (solo import). La pantalla de temas muestra «Palabras vistas: N de M» y el aviso si el navegador no guarda nada.
- [x] **T1.18** (M) Accesibilidad completa: atajos 1/2/3 con `aria-keyshortcuts`, foco a «Seguir», `role="status"`, `prefers-reduced-motion`, botones ≥ 44 × 44 px, emoji con nombre accesible `[AC-SP4-5, AC-SP4-6, AC-SP4-11]`
  - Hecho en `src/components/word-jump/round-view.tsx` (nuevo; la ronda sale de `word-jump-game.tsx`). Tras «Seguir» el foco vuelve al título de la pregunta. El hueco se lee «(hueco)». Correcto/incorrecto: texto en `role="status"` y borde sólido/punteado, nunca solo color. Los atajos van como texto de ayuda, no dentro del botón, para que su nombre accesible siga siendo la palabra.
- [x] **T1.19** (M) E2E: ronda de cada modo con fixtures; ronda completa solo con teclado; recargar conserva el progreso; reduced-motion sin animación `[AC-SP4-5, AC-SP4-6, AC-SP4-7]`
  - Hecho en `tests/e2e/word-jump.spec.ts`, con tres temas «PRUEBA» nuevos en el fixture. Reduced-motion se verifica contando `requestAnimationFrame` tras responder (> 0 sin la preferencia, 0 con ella).
- [x] **Extra (pedido 2026-11-18):** Saltapalabras en la tarjeta «Juegos» de la portada (`help-education.tsx`), enlazando a `/juegos/saltapalabras`. Test de componente + e2e. Cierra la pregunta 5 de spec §14.

> **⛔ Checkpoint 1b** — los cuatro modos sin audio se juegan con teclado y el progreso sobrevive a
> recargar. `pnpm check:task`, `pnpm build`, `pnpm test:e2e`.

---

## H2 — Acceso `/admin` (humano)

- [ ] **H2.1** `ADMIN_USER` / `ADMIN_PASSWORD` en Vercel (Production y Preview). Si edicion-fotos ya hizo su H2, no hay nada que hacer.

## F2 — `/admin/juego` (SP3 publicar, SP5, SP6)

- [x] **T2.0** (S) **Dependencia externa.** Si `src/proxy.ts` y `src/lib/admin/basic-auth.ts` no están en `main`, implementar T1.1 y T1.2 de [tasks/edicion-fotos/todo.md](../edicion-fotos/todo.md) exactamente como allí, en un commit propio, y marcarlas hechas en los dos `todo.md` (plan §2) `[AC-E1-1 … AC-E1-5]` — **Hecho 2026-11-18, sin código nuevo:** la rama `integracion` ya trae `src/proxy.ts` y `src/lib/admin/basic-auth.ts` de edicion-fotos (commit `1bac5f3`); se reusan tal cual.
- [x] **T2.1** (S) Tests de acceso de las rutas de juego: sin credenciales, `/admin/juego` y `/api/admin/juego/**` dan 401; los handlers rechazan aunque se llamen sin proxy; el proxy no corre en `/juegos/**` `[AC-SP5-8, AC-SP5-9, AC-SP5-10]` — **Hecho 2026-11-18.** `tests/unit/admin/game-routes.test.ts` (401 en los cinco handlers sin pasar por el proxy, sin tocar la base), `tests/unit/admin/game-admin-page.test.tsx` y `tests/e2e/pack-admin.spec.ts`. AC-SP5-10 lo cubre el test existente del `matcher` en `tests/unit/admin/proxy.test.ts` (solo `/admin/:path*` y `/api/admin/:path*`).
- [x] **T2.2** (M) `library.ts`: `publishPack` (llama a `publish_language_pack`, traduce `40001` → `version_conflict` y `22023` → `language_mismatch`) y `listVersions`, sin caché. **Tests primero** `[AC-SP3-3, AC-SP3-4, AC-SP3-5]` — **Hecho 2026-11-18. Desvío:** va en un módulo nuevo `src/lib/language-packs/publishing.ts` (server-only) y no en `library.ts`, para separar la lectura pública cacheada (que lanza) de la del admin (que devuelve el error como valor). Suma `readCurrentPack` (con la nota), `readVersion` (para «Descargar» y «Restaurar») y `audioBaseUrlFrom`.
- [x] **T2.3** (M) `POST /api/admin/juego/[lengua]/publicar`: Basic Auth → `parsePack` → `cleanPack` → `validatePack` en el servidor → nota obligatoria → `publishPack` → `revalidateTag("word-jump-pack:<lengua>", "max")` **solo**, sin `revalidatePath` (plan §3.1, resultado 3a). **Tests llamando al handler directo** `[AC-SP6-6, AC-SP6-7, AC-SP6-11, AC-SP6-12]` — **Hecho 2026-11-18.** Validación del cuerpo en `src/lib/language-packs/publish-request.ts` (puro); chequeos comunes (Basic Auth, lengua, Supabase configurado) en `admin-route.ts`. Nota de hasta 500 caracteres. **Rutas extra:** `GET /api/admin/juego/[lengua]` (lo publicado, para «Descargar la publicada»), `GET …/versiones/[version]` y `POST …/restaurar` (mismo `revalidateTag` solo).
- [x] **T2.4** (S) `GET /api/admin/juego/[lengua]/versiones`: historial con fecha y nota `[AC-SP6-9]` — **Hecho 2026-11-18.**
- [x] **T2.5** (L) `src/app/admin/juego/page.tsx` (servidor, `noindex`) + `src/components/admin/pack-admin/`: estado por lengua, importar `.json`, lista de errores y avisos que lleva al ítem, exportar, publicar con conflicto («Descargar la publicada» / «Publicar igual»), historial con «Descargar» y «Restaurar». Todo con teclado y `<label>` `[AC-SP6-3, AC-SP6-4, AC-SP6-7, AC-SP6-8, AC-SP6-9]` — **Hecho 2026-11-18.** La tarjeta de `/admin/juego` se agregó a `src/app/admin/page.tsx`. **Desvíos:** los botones del historial llevan `aria-label` («Restaurar la versión 1»), porque con un `<span class="sr-only">` el espacio inicial se perdía y el nombre accesible quedaba «Restaurarla versión 1». La lista de palabras va siempre visible (no en `<details>`) para que los enlaces de los errores lleguen a un ítem visible.
- [x] **T2.6** (M) Paquete en preparación en `localStorage` (`living-langs:pack-admin:v1:<lengua>`), «Descartar», aviso si `setItem` falla (plan §3.8) `[AC-SP6-13]` — **Hecho 2026-11-18.** Lógica pura en `src/lib/language-packs/draft-storage.ts` (recibe el storage por argumento) y store con `useSyncExternalStore` en `pack-admin/draft-store.ts`; si `setItem` falla, el paquete sigue en memoria y se avisa. Al publicar se descarta el paquete en preparación; al restaurar, no.
- [x] **T2.7** (M) «Probar»: los componentes de `word-jump/` en modo `preview`, con ítems sin verificar marcados y aviso visible; no escribe progreso; nada de eso aparece en rutas públicas `[AC-SP6-10]` — **Hecho 2026-11-18.** `previewThemes` en `playable.ts` (el mismo filtro sin exigir verificado ni fuente) y `previewPack` en `game-state.ts`. `WordJumpGame` gana `preview` (aviso visible, sin leer ni escribir progreso) y `RoundView` muestra «⚠ Sin verificar» en la respuesta de un ítem sin verificar, que en el juego público nunca llega ahí.
- [x] **T2.8** (M) `tests/e2e/pack-admin.spec.ts` contra el Supabase falso: importar inválido no cambia nada; importar válido → probar → publicar → la página pública muestra la versión nueva como tarde en la segunda visita; conflicto de versión; restaurar `[AC-SP6-4, AC-SP6-7, AC-SP6-9, AC-SP6-10, AC-SP6-11]` — **Hecho 2026-11-18.** Un flujo `test.describe.serial` que publica siempre el fixture, para no cambiar lo que ven los e2e del juego en paralelo. `fake-supabase.mjs` suma historial, `publish_language_pack` en memoria (con `40001` y `22023`) y lectura de versiones.

> **⛔ Checkpoint 2** — desde `/admin/juego` se publica un paquete y el juego lo muestra, todo contra
> el Supabase falso. En Supabase real solo se publica el paquete de H3.

---

## F2b — Editor mínimo (SP6b, 2026-11-20)

- [x] **T2b.1** (M) `src/lib/language-packs/edit-pack.ts` puro: `updateItem` (en todos los temas donde está la misma palabra), `verifyTheme`, `addItem` (sin `id`, lo asigna `cleanPack`), `removeItem` (solo de ese tema) y `checkItemFields`. **Tests primero** `[AC-SP6b-2, AC-SP6b-4, AC-SP6b-5, AC-SP6b-6]` — **Hecho 2026-11-20.** `edit-pack.ts` suma `filterItems` (búsqueda sin tildes ni mayúsculas) y `anchorTarget` (de un enlace de aviso a su tema e ítem). 17 tests en `tests/unit/language-packs/edit-pack.test.ts`. **Desvío:** «la misma palabra» se reconoce por `normalizeWord`, no por `id`, porque `cleanPack` da un `id` distinto a la misma palabra en cada tema (spec §9.5 E2 corregida).
- [x] **T2b.2** (M) `pack-editor.tsx` + `editor-row.tsx`: elegir tema, búsqueda, filtros «Sin verificar» y «Sin dibujo», casilla «Verificada», edición en la fila con foco que vuelve a «Editar». Reemplaza `pack-items.tsx` `[AC-SP6b-1, AC-SP6b-2, AC-SP6b-3, AC-SP6b-7, AC-SP6b-9]` — **Hecho 2026-11-20.** Además `item-fields.tsx` (los tres campos con su error, compartidos con agregar). `pack-items.tsx` borrado. 14 tests de componente en `tests/unit/admin/pack-editor.test.tsx`. El foco al abrir y cerrar se maneja con una ref, sin `setState` dentro de efectos.
- [x] **T2b.3** (S) `verify-theme.tsx` (confirmación con el número) y `add-item-form.tsx` (palabra, traducción, emoji, fuente) `[AC-SP6b-4, AC-SP6b-6]` — **Hecho 2026-11-20.** Tras «Sí, marcar» y tras «Sí, quitar» el foco va al título del tema (el botón queda deshabilitado o la fila desaparece).
- [x] **T2b.4** (S) Los enlaces de avisos llevan al tema y a la fila aunque un filtro la oculte; «Partir del publicado» pasa a «Editar el paquete publicado» `[AC-SP6b-1, AC-SP6b-7]` — **Hecho 2026-11-20.** El editor lee el hash al abrir y escucha `hashchange`. Limitación: volver a pulsar el mismo enlace no dispara `hashchange`; si el ítem está visible, el salto nativo del navegador alcanza.
- [x] **T2b.5** (M) e2e contra el Supabase falso: editar el emoji, desmarcar, marcar todo el tema, agregar y quitar, recargar (persiste), probar y publicar; teclado y 360 px `[AC-SP6b-1 … AC-SP6b-9]` — **Hecho 2026-11-20, con desvío:** el e2e edita el emoji con teclado, desmarca, comprueba 360 px sin scroll horizontal, recarga (persiste), prueba y **descarta**; **no publica lo editado**, porque los e2e del juego corren en paralelo y deben seguir viendo el fixture. Publicar un paquete editado es el mismo flujo ya cubierto en ese archivo; «marcar todo», agregar y quitar quedan en los tests de componente.

> **⛔ Checkpoint 2b** — se corrige el paquete publicado sin tocar JSON y se publica como versión
> nueva; el juego la muestra.

---

## H4 · H5 — Bucket y consentimiento (humano)

- [ ] **H4.1** Crear el bucket público `audio` con límite de 2 MB y los tipos MIME de spec §6.1. Pegar el bloque SP8 del SQL y anotar la fecha.
- [ ] **H5.1** Consentimiento de cada hablante (publicación y cómo quiere ser acreditada/o) antes de subir su voz.

## F3 — Audio (SP8)

- [ ] **T3.1** (M) `POST /api/admin/juego/[lengua]/audio` (`multipart/form-data`): Basic Auth → tipo y tamaño → subida con `service_role` a `audio/<language>/<uuid>.<ext>` → URL pública. **Tests llamando al handler directo** `[AC-SP8-2, AC-SP8-7, AC-SP8-9]`
- [ ] **T3.2** (M) En `/admin/juego`, «Subir archivo» por ítem, con la confirmación de consentimiento antes del primer audio de la sesión y escritura de `item.audio` `[AC-SP8-9]`
- [ ] **T3.3** (M) Modo `listen` en `questions.ts` y `playable.ts` (mínimo 3 ítems verificados **con audio**). **Tests primero** `[AC-SP1-6, AC-SP8-4]`
- [ ] **T3.4** (M) Botón de sonido en el juego: `<audio preload="none">` con `src` asignado al pulsar, respeta `settings.sound` `[AC-SP8-5, AC-SP8-8]`
- [ ] **T3.5** (S) Consulta de audios huérfanos en `docs/saltapalabras-schema.sql` (spec §10).
- [ ] **T3.6** (S) Párrafo de privacidad en `src/lib/privacy/policy.ts` y `docs/politica-privacidad.md` (spec §8.1). Queda pendiente de H7.
- [ ] **T3.7** (M) E2E: subir un audio de prueba al falso, publicar, jugar «escuchar»; antes de pulsar, ninguna petición al dominio del falso de Storage `[AC-SP8-4, AC-SP8-5, AC-SP8-8]`

> **⛔ Checkpoint 3** — la ronda «escuchar» se juega con audios subidos desde `/admin/juego`.

---

## F5a — Nivel de plataformas de punta a punta (SP4b, 2026-11-20)

- [x] **T5a.1** (M) `platformer/physics.ts` con tests primero: gravedad, correr, salto variable, margen de salto, suelo y bloqueo por la puerta `[AC-SP4b-6]` — Hecho: `stepBody` corta los cuadros largos (32 ms por paso, 250 ms por cuadro) para no atravesar la puerta.
- [x] **T5a.2** (M) `platformer/level.ts` con tests: trazado de retos, nubes (3 o 4), puertas y meta; choque cabeza–nube; cámara `[AC-SP4b-1, AC-SP4b-2]` — Hecho: en la física la puerta es un muro de alto infinito (`DOOR_HEIGHT` es solo dibujo); las nubes de los retos siguientes se dibujan en blanco, sin texto.
- [x] **T5a.3** (M) `platformer/game.ts` con tests: responder, tachar, puntos 10/5, avanzar, meta, resultado para el progreso, falladas `[AC-SP4b-2, AC-SP4b-3, AC-SP4b-5]` — Hecho: `levelOutcomes` devuelve el mismo `RoundOutcome` de `round.ts` (`revealed` siempre false), así `stats.ts` no cambia.
- [x] **T5a.4** (L) Componentes: vista DOM, canvas con bucle que se detiene en reposo, dibujo original, controles de teclado y táctiles, «Seguir», menú `[AC-SP4b-1, AC-SP4b-4, AC-SP4b-9, AC-SP4-5, AC-SP4-6]` — Hecho: `platformer-game.tsx` (DOM), `platformer-controller.ts` (bucle, cuerpo y teclas, fuera del estado de React) y `draw-platformer.ts`. Desvíos: los controles táctiles van fuera del orden de tabulación y con `aria-hidden` (el teclado tiene las flechas y cada respuesta es un botón); el menú es un panel con `aria-expanded`, no un diálogo modal.
- [x] **T5a.5** (S) Efectos de sonido con Web Audio y botón de sonido guardado en `settings.sound`; 🔊 solo con grabación `[AC-SP4b-7, AC-SP4b-8]` — Hecho: `sound-effects.ts` y `saveSound` en `progress-store.ts`. El 🔊 de la grabación se deshabilita con el sonido apagado.
- [x] **T5a.6** (M) Meta con resumen, puntos y «Repasar las falladas» `[AC-SP4b-5, AC-SP4-2]` — Hecho: «¡Llegaste a la meta!», puntos y «Repasar las falladas».
- [x] **T5a.7** (M) Tests de componente y e2e adaptados y nuevos (incluido saltar con el teclado a la nube correcta y 360 px) `[AC-SP4-2, AC-SP4-4, AC-SP4-5, AC-SP4-6, AC-SP4b-*]` — Hecho: tests de componente nuevos (`platformer-game.test.tsx`, `platformer-controller.test.ts`) y adaptados; e2e adaptados y 3 nuevos (salto con el teclado, 360 px, ninguna otra página descarga el juego).
- [x] **T5a.8** (S) Medir el JS extra de la ruta y confirmar ISR `[AC-SP4b-10, AC-SP4-1]` — Hecho: el chunk del juego pesa 10,9 KB gzip (29,5 KB sin comprimir) y solo lo descarga la ruta del juego; `/juegos/saltapalabras/[lengua]` sigue ISR.

> **⛔ Checkpoint 5a** — un nivel completo se juega con física y con botones, se llega a la meta y el progreso se guarda.

## F5b — Obstáculos y vidas (SP4b)

- [ ] **T5b.1** (M) Huecos en el suelo y plataformas elevadas en `level.ts` / `physics.ts`, con semilla.
- [ ] **T5b.2** (M) Caracoles que van y vienen: tocarlo quita una vida, pisarlo lo elimina y da +2.
- [ ] **T5b.3** (M) Vidas con corazones; caer o tocar un caracol devuelve al inicio del reto; sin vidas, meta con resumen.
- [ ] **T5b.4** (S) Con botones / 1-2-3 nunca se cae ni se choca: la vía accesible no pierde vidas.

## F5c — Ajustes y personajes (SP4b)

- [ ] **T5c.1** (M) Ajustes por partida (Principiante / Intermedio / Avanzado y cada opción) guardados en `settings`, validados al leer.
- [ ] **T5c.2** (M) Personajes a elegir, dibujados en código (zorrito por defecto).
- [ ] **T5c.3** (S) «Decir la palabra al acercarse», solo con grabación.

---

## F4 — Cierre

- [ ] **T4.1** (M) `docs/saltapalabras-pruebas.md`: checklist manual contra Supabase real (sin publicar paquetes de prueba), prueba de AC-SP3-11 pausando el proyecto o cortando la red del servidor, cómo reactivar Supabase (H6), entrega de la contraseña de `/admin` solo a personas adultas del equipo `[AC-SP3-11]`
- [ ] **T4.2** (S) `pnpm check:full` en verde.
- [ ] **T4.3** (S) Revisión final: `grep -rn "NEXT_PUBLIC_" src/` sin claves de Supabase; `supabase-admin` no importado desde componentes cliente; `solicitudes` sin cambios `[AC-SP3-9, AC-SP3-12]`
- [ ] **T4.4** (S) `specs/saltapalabras.md` y `specs/README.md` a `implementado` cuando H7 y H8 estén hechas.
- [ ] **H7** Aprobar el párrafo de privacidad.
- [ ] **H8** Prueba manual en Preview según `docs/saltapalabras-pruebas.md`, registrada con fecha.

---

## Pendientes que no bloquean el código

- Pregunta 1 (fuente para aimara), 5 (entrada desde el home), 7 (`ROUND_SIZE`), 8 (retiro de un audio)
  del spec §14.
- Pregunta 3: llevar `docs/saltapalabras-schema.test.sql` a CI. Hasta entonces se corre a mano (T1.7).
