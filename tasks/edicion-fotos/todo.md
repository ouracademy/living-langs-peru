# TODO — Edición de fotos (`/admin/fotos`)

> Plan y razonamiento: [tasks/edicion-fotos/plan.md](./plan.md) · Spec: [specs/edicion-fotos.md](../../specs/edicion-fotos.md)
> Estado: **F0–F3 (código) hechas** (2026-11-18); T2.9 y T3.3 esperan H1 y H2. Rama: `feat/edicion-fotos`.

Cada tarea cierra cuando pasan sus criterios **y** la definición de terminado (plan §6):
`pnpm check:fast` · `pnpm check:task` · commit propio. Tamaño: **S** < 2 h · **M** medio día · **L** un día.

**Reglas que no se negocian en ninguna tarea:**

1. `GITHUB_TOKEN`, `ADMIN_USER` y `ADMIN_PASSWORD` **solo en el servidor**: nunca con `NEXT_PUBLIC_`,
   nunca en un log, nunca en un mensaje de error.
2. **Nada llega a `main` sin pasar `validatePeople`** (spec #9).
3. `proxy.ts` y `basic-auth.ts` **no saben de fotos**: los reusa `/admin/juego` (plan §3.1).
4. No se agrega `src/data/` a `.prettierignore` ni se baja ningún número de CONSTRAINTS.md.
5. Identificadores en inglés, texto para personas en español.
6. Dependencias: solo las que aprueba F0 (`image-size`; `prettier` en `dependencies` si se elige la
   opción a de plan §3.6). Cualquier otra, se pregunta.

---

## F0 — Verificaciones que pueden cambiar el diseño

- [x] **T0.1** (S) En una rama de prueba: `pnpm add image-size` y `pnpm check:deps`. Anotar versión y resultado en plan §4. Si falla: plan B de plan §3.7 y actualizar spec #7 `[riesgo osv-scanner]`
  - Hecho en `feat/edicion-fotos`: `image-size@2.1.0`. `osv-scanner` no está instalado en local; consulta directa a la API de OSV sin hallazgos. El veredicto de `check:deps` queda para CI (plan §4.1).
- [x] **T0.2** (S) Página de prueba local (no se commitea) que reduce una foto de 12 MP con `canvas.toBlob('image/jpeg', 0.85)`. Probar en Chrome, Firefox, Safari macOS y Safari iOS: tipo `image/jpeg`, lado mayor ≤ 2400, < 3 MB, sin EXIF. Anotar resultados en plan §4 `[AC-E3-1, AC-E3-2]`
  - Hecho con un script de Playwright en Chromium, Firefox y WebKit (plan §4.1). **Pendiente:** Safari macOS e iOS reales, en H3.
- [x] **T0.3** (S) Pasar `prettier` a `dependencies` (spec decisión #14) y confirmar que `prettier.format(ashaninka.json, { parser: "json" })` con `prettier/standalone` da exactamente el archivo actual. `pnpm check:deps` sigue limpio `[riesgo formato]`

> **⛔ Checkpoint 0** — las tres verificaciones tienen resultado escrito en el plan. Si alguna cambió
> una decisión del spec, el spec está actualizado antes de seguir.

---

## F1 — Acceso y lectura (E1, E2)

- [x] **T1.1** (M) `src/lib/admin/basic-auth.ts`: `checkBasicAuth(header, env)` → `ok | missing_config | unauthorized` y `unauthorizedResponse()` (`401` + `WWW-Authenticate: Basic realm="Edición", charset="UTF-8"`). SHA-256 + `timingSafeEqual` (plan §3.4). **Tests primero:** correcto, contraseña incorrecta, usuario incorrecto, cabecera ausente, mal formada, base64 inválido, variables vacías `[AC-E1-1, AC-E1-2]`
- [x] **T1.2** (S) Leer `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` (matcher, Node runtime, producir una respuesta). `src/proxy.ts` con `matcher: ['/admin/:path*', '/api/admin/:path*']`: config ausente → `503`, credenciales inválidas → `401` (plan §3.3) `[AC-E1-1, AC-E1-2, AC-E1-4]`
- [x] **T1.3** (M) `src/lib/admin/github.ts`, parte de lectura: `readFile(path)` → `{ content, commitSha }` con `fetch` inyectado. Traduce `401`/`403`/`404`/red a códigos propios (`github_unauthorized`, `github_unavailable`). **Tests con `fetch` simulado** `[AC-E2-2]`
  - Desvío: la función se llama `readRepoFile(config, path, fetch)` y resuelve primero el ref (`readBranchSha`) para leer el archivo en ese commit exacto. `readGitHubConfig(env)` valida `GITHUB_REPOSITORY` y `GITHUB_BRANCH` (por defecto `main`; el token es opcional para leer).
- [x] **T1.4** (M) `src/app/api/admin/fotos/route.ts` `GET`: `checkBasicAuth` **otra vez** (no confía en el proxy) → `readFile` de `src/data/peoples/ashaninka.json` → `{ photos, sha }`. **Tests llamando al handler directo**, sin proxy `[AC-E1-3, AC-E2-1, AC-E2-2]`
  - Desvío: archivo nuevo `src/lib/admin/gallery-source.ts` (`readGallery`, mensajes en español) que comparten la ruta y la página. Código extra `github_not_configured` (`503`) cuando falta `GITHUB_REPOSITORY`; los errores de GitHub responden `502`.
- [x] **T1.5** (M) `src/app/admin/fotos/page.tsx` (servidor, `robots: { index: false }`) + `src/components/admin/photo-editor.tsx` (cliente) en modo **solo lectura**: lista con miniatura (plan §3.9), descripción, pie y crédito, en orden; aviso «los cambios tardan 1–2 minutos»; «Para salir, cierra el navegador»; error «No pudimos leer la galería» **sin** formulario `[AC-E1-5, AC-E2-1, AC-E2-2]`
  - Desvíos: la página lee GitHub en el servidor (no desde el cliente vía la API) y vuelve a comprobar las credenciales (sin ellas, «Acceso restringido» y ninguna llamada a GitHub). Miniaturas: `next/image` con el `src` local y, si falla la carga (foto aún no desplegada), «Pendiente de publicar»; se descartó la URL _raw_ de GitHub para no sumar `remotePatterns` ni un `<img>` que el lint rechaza (plan §3.9, alternativa).
- [x] **T1.6** (S) E2E `tests/e2e/admin-photos.spec.ts`: sin credenciales `/admin/fotos` y `POST /api/admin/fotos` dan `401`; `/`, `/ashaninka` y un asset de `/_next/static` responden sin `401`; ninguna página pública enlaza a `/admin` `[AC-E1-1, AC-E1-4, AC-E1-5]`
  - `playwright.config.ts` pasa credenciales solo de prueba al `webServer` (`env`) para que la respuesta sea `401` y no `503`. Test extra: credenciales incorrectas → `401`.
- [x] **T1.7** (S) `pnpm build`: `/ashaninka` sigue `○`; `/admin/fotos` y `/api/admin/fotos` `ƒ`. `pnpm check:task`.

> **⛔ Checkpoint 1** — en local, `/admin/fotos` pide contraseña y, con ella, muestra las 5 fotos de
> `main`. Sin variables, responde `503`.
>
> **Estado (2026-11-18):** contraseña y `503` verificados contra `next start`. «Muestra las 5 fotos» está
> verificado con GitHub simulado (tests de ruta y de página); no se llamó a la API real de GitHub.

## H1 · H2 — Token y variables (humano)

- [ ] **H1** Crear el _fine-grained token_: solo `ouracademy/living-langs-peru`, _Contents: Read and write_, nada más, vencimiento al cierre del proyecto. Anotar la fecha de vencimiento en `docs/edicion-fotos-pruebas.md` (no el token).
- [ ] **H2** Cargar `ADMIN_USER`, `ADMIN_PASSWORD` (larga, al azar), `GITHUB_TOKEN` (**Sensitive**), `GITHUB_REPOSITORY=ouracademy/living-langs-peru`, `GITHUB_BRANCH=main` en Vercel **Production** y **Preview**, y en `.env.local`. Decidir si Preview usa otra rama (plan §4). Redeploy.

---

## F2 — Agregar una foto de punta a punta (E3)

- [x] **T2.1** (S) `package.json`: `"build": "pnpm peoples:check && next build"` (spec #9, plan §3.10). Comprobar que un `ashaninka.json` roto a propósito (en local, sin commitear) hace fallar `pnpm build` `[AC-E3-8]`
  - Hecho: con `photos[0].alt` vacío a propósito, `pnpm build` termina con exit 1 en `peoples:check` antes de `next build`. Archivo restaurado.
- [x] **T2.2** (M) `src/lib/admin/gallery.ts` (puro): `applyAction(people, action)` para `add` y `validateResult` con `validatePeople` + límites de spec §6.3 (24 fotos, largos, `https://`). Serializa con el formato elegido en T0.3. **Tests primero:** alta válida, cada campo faltante, descripción genérica, galería llena, salida idéntica a Prettier `[AC-E3-4]`
  - Hecho. Desvíos: los límites de texto viven en `src/lib/admin/photo-fields.ts` (puro, lo usan el formulario y el servidor); `validate.ts` exporta `isGenericAlt` para que ambos apliquen la misma regla que `peoples:check`, sin copia. `applyAction` también rechaza un `src` repetido. `serializePeople` formatea `JSON.stringify(…, null, 2)` con Prettier y reproduce el archivo byte a byte.
- [x] **T2.3** (M) `github.ts`, parte de escritura: `commitFiles({ baseSha, files, deletions, message, author })` → blob → tree (`base_tree`) → commit → ref con `force: false`. `422` no fast-forward → `version_conflict`. Mensaje `chore: update ashaninka gallery (<acción>)` con test contra `commitlint.config.mjs` (plan §3.11). **Tests con `fetch` simulado:** un solo commit con imagen + JSON, conflicto `[AC-E3-1, AC-E3-5]`
  - Hecho. Desvío: **sin `author`** en el commit. La API exige nombre **y** correo, y no hay un correo del editor; GitHub registra al dueño del token, que es quien de verdad guardó (spec #12 decía «Edición de fotos»). El test de commitlint corre la CLI real (`@commitlint/cli`). Se agregó `readRepoFileAt` y `GITHUB_API_URL` opcional (ver T2.8).
- [x] **T2.4** (S) Medidas: `image-size` (o lector SOF según T0.1) sobre el buffer recibido; rechaza no-JPEG, > 3 MB o > 2400 px con `photo_invalid`. **Tests con fixtures** que mienten en `width`/`height` del formulario `[AC-E3-3]`
  - Hecho en `src/lib/admin/photo-file.ts` (`inspectPhoto`). Los límites numéricos están en `photo-limits.ts`, sin dependencias, para que el navegador no cargue `image-size`. Fixtures JPEG/PNG mínimos en `tests/unit/admin/jpeg-fixture.ts`.
- [x] **T2.5** (M) `route.ts` `POST` (`multipart/form-data`): auth → parsear → medidas → nombre `<aaaa-mm-dd>-<6 al azar>.jpg` → `applyAction` → validar → `commitFiles`. Respuestas `photo_invalid`, `gallery_full`, `version_conflict`, `github_unavailable` con mensaje en español. Log con acción y `sha`, sin token ni credenciales. **Tests del handler** `[AC-E1-3, AC-E3-1, AC-E3-3, AC-E3-4, AC-E3-5, AC-E3-10]`
  - Hecho. Antes de leer el JSON compara la cabeza de la rama con el `sha` recibido (conflicto temprano, sin escribir); el `PATCH` sin `force` sigue siendo la barrera real. Estados: `photo_invalid` y `gallery_full` 400, `version_conflict` 409, errores de GitHub 502, sin token `github_not_configured` 503. Tests en `photos-route-post.test.ts` con `@vitest-environment node` (el `FormData` de jsdom no pasa por el `Request` de undici).
- [x] **T2.6** (M) `src/components/admin/resize-image.ts`: parte pura (medidas destino, tipos aceptados JPEG/PNG/WebP) con tests; parte `canvas` → JPEG 0,85, lado mayor ≤ 2400 `[AC-E3-1, AC-E3-2]`
  - Hecho. `createImageBitmap(…, { imageOrientation: "from-image" })` aplica la rotación EXIF antes de perder los metadatos. Si a 0,85 pasa de 3 MB, prueba 0,75 y 0,65. `src/components/**` está fuera de la cobertura de Vitest; la parte de `canvas` la cubre el e2e.
- [x] **T2.7** (M) Formulario «Agregar foto» en `photo-editor.tsx`: los cinco campos con `<label>`, obligatorios que no dejan enviar, progreso mientras reduce y sube, éxito «Foto guardada. Se verá en la web en 1–2 minutos.» con enlace a `/ashaninka`, conflicto «Alguien guardó antes. Recarga y vuelve a intentar.» **Test de componente:** no envía con campos vacíos `[AC-E3-4, AC-E3-5]`
  - Hecho. Valida en el navegador con las mismas reglas del servidor antes de reducir o subir, marca `aria-invalid` y lleva el foco al primer campo con problema. Tras guardar, `router.refresh()` vuelve a leer la rama (lista y `sha` nuevos).
- [x] **T2.8** (S) E2E con `POST /api/admin/fotos` interceptado (`page.route`) y credenciales de prueba: lo enviado es `image/jpeg`, ≤ 2400 px, con los cinco campos `[AC-E3-1]`
  - Hecho. Desvío: para que la página muestre el formulario, el servidor tiene que **leer** la galería. Se agregó `tests/e2e/fake-github.mjs` (`node:http`, solo lectura, sin dependencias) como primer `webServer`, y `playwright.config.ts` pasa `GITHUB_API_URL` apuntando a él y `GITHUB_TOKEN=""` (un `.env.local` local nunca le da un token real al servidor de pruebas). El `POST` sigue interceptado con `page.route`: verifica JPEG, lado mayor 2400, < 3 MB, campos y `sha`.
- [ ] **T2.9** (S) **Con H1 y H2 hechos:** desde Preview, agregar una foto «PRUEBA». Comprobar en GitHub **un solo** commit con el JPEG y el JSON, que CI pasa (incluido `format:check`), y que tras el deploy aparece en `/ashaninka`. Quitarla en T3.3 `[AC-E3-1, AC-E3-2, AC-E3-9]`

> **⛔ Checkpoint 2** — una foto subida desde el navegador aparece en la web sin que un dev toque nada,
> y CI quedó verde en `main` después del commit del editor.

---

## F3 — Editar, ordenar, quitar (E3)

- [x] **T3.1** (M) `gallery.ts`: acciones `edit` (texto y crédito, no el archivo), `move` (arriba/abajo) y `remove` (entrada + ruta del archivo a borrar). **Tests primero** de cada una y de su validación `[AC-E3-4, AC-E3-6, AC-E3-7]`
  - Hecho. `edit` cambia descripción, pie y crédito y conserva `src`, medidas y lugar; `move` intercambia con la vecina y rechaza pasar de un extremo («Ya es la primera foto.»); `remove` devuelve `deletedFile` y solo acepta rutas dentro de `/peoples/ashaninka/` (un `src` manipulado no puede borrar otro archivo). Código nuevo `photo_not_found` para un `src` que ya no está. Cada acción pasa por `validatePeople` sobre el archivo entero.
- [x] **T3.2** (M) `route.ts` y `photo-editor.tsx`: editar en el lugar, botones «Subir» / «Bajar» con foco que sigue a la foto movida, «Quitar» con confirmación. Un commit por guardado. **Test de componente:** ordenar con teclado `[AC-E3-5, AC-E3-6, AC-E3-7]`
  - Hecho. Desvíos: `PATCH` (`action: "edit" | "move"`, JSON) y `DELETE` (JSON) en la misma ruta, con un solo camino de guardado (`save`) compartido con `POST`; `photo_not_found` responde 404. Cada guardado responde con la lista tal como quedó en el commit y el `sha` nuevo: el editor la muestra al instante y manda ese `sha` en el siguiente guardado, y `router.refresh()` vuelve a leer la rama. Quitar pide confirmación dentro de la fila (sin `window.confirm`), con el foco en «Cancelar». El foco sigue a la foto movida; al quitar va a la foto vecina. Tests: `photos-route-change.test.ts` (ruta), `photo-editor-rows.test.tsx` (componente: ordenar con teclado, editar, quitar) y un e2e que mueve con Enter y comprueba el foco en un navegador real.
- [ ] **T3.3** (S) Desde Preview: editar el crédito de la foto «PRUEBA», moverla, y quitarla. Comprobar que quitar borra entrada **y** archivo en el mismo commit y que `peoples:check` pasa `[AC-E3-6]`

> **⛔ Checkpoint 3** — la galería en `main` quedó igual que al empezar (las 5 fotos originales, en su
> orden), y el historial muestra los commits de prueba.

---

## F4 — Cierre

- [ ] **T4.1** (S) `docs/edicion-fotos-pruebas.md`: cómo probar (Preview escribe en `main`, foto «PRUEBA», quitar al final), qué esperar (deploy + CI por guardado), fecha de vencimiento del token, cómo rotar contraseña y token, cómo revertir un guardado con `git revert`.
- [ ] **T4.2** (S) `pnpm check:full` en verde. `pnpm build`: `/ashaninka` `○`, `/admin/fotos` y `/api/admin/fotos` `ƒ` `[AC-E3-9]`
- [ ] **T4.3** (S) `grep -rn "NEXT_PUBLIC_" src/` sin variables nuevas; `pnpm check:secrets` limpio `[AC-E3-10]`
- [ ] **H3** Prueba manual completa en Preview siguiendo `docs/edicion-fotos-pruebas.md`, incluida una subida desde un celular. Registrar fecha y resultado en ese archivo.
- [ ] **H4** Entregar la contraseña al editor por un canal privado.
- [ ] **T4.4** (S) `specs/edicion-fotos.md` y `specs/README.md` → `implementado`. Marcar las tareas de este archivo.
