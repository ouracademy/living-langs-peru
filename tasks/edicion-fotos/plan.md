# Plan de implementación — Edición de fotos (`/admin/fotos`)

> Spec: [specs/edicion-fotos.md](../../specs/edicion-fotos.md) · Fecha: 2026-11-17 · Rama base: `main`
> Lista de tareas ejecutable: [tasks/edicion-fotos/todo.md](./todo.md)

---

## 1. Cómo se corta el trabajo

El mapa del spec (§3) tiene tres capacidades en cadena: E1 acceso, E2 lectura desde GitHub, E3
guardar. El plan corta **vertical**: cada fase termina con algo que se usa en el navegador real, y
la parte más riesgosa (escribir en `main` desde el servidor) llega cuando el acceso y la lectura ya
están probados.

```
F0 verificaciones (image-size, toBlob, formato del JSON)
        │
        ▼
F1 acceso + lectura ──> el editor entra y ve la galería de main
        │
        ▼
F2 agregar ──────────> sube una foto y aparece en /ashaninka tras el deploy
        │
        ▼
F3 editar · ordenar · quitar
        │
        ▼
F4 cierre: e2e, build, prueba real en Preview, docs
```

Las etiquetas `E1..E3` se conservan en cada tarea para trazar con el spec.

**Por qué hay una F0.** Tres cosas pueden invalidar el diseño antes de escribir una línea: que
`image-size` no pase `osv-scanner`, que algún navegador no produzca JPEG con `canvas.toBlob`, y que
el JSON que escribe el servidor no quede con el formato de Prettier (CI corre `pnpm format:check` en
cada push, incluidos los commits del editor). Son verificaciones de horas, no de días, y si una
falla cambia la decisión correspondiente del spec, no el plan entero.

## 2. Orden y dependencias

| Fase | Capacidad | Depende de | Qué se puede mostrar al terminar                                                             |
| ---- | --------- | ---------- | -------------------------------------------------------------------------------------------- |
| F0   | —         | —          | Las tres verificaciones anotadas en este plan (§4), con su resultado.                        |
| F1   | E1, E2    | F0         | `/admin/fotos` pide usuario y contraseña; con ellos muestra las 5 fotos de `main`.           |
| F2   | E3        | F1, H1, H2 | Desde Preview se agrega una foto «PRUEBA»: un solo commit en `main` y aparece en la web.     |
| F3   | E3        | F2         | Editar, subir/bajar y quitar, cada uno con un commit.                                        |
| F4   | todo      | F1–F3      | `pnpm check:full` en verde y la prueba manual registrada en `docs/edicion-fotos-pruebas.md`. |

F1 no necesita el token de GitHub con permiso de escritura, pero sí **leer**; con el repo público
la lectura funciona sin token, así que F1 se puede construir y probar antes de H1.

## 3. Decisiones de implementación

Lo que el spec deja abierto o que solo se ve al escribir el código. Las decisiones del spec se citan
por número (`#4`), no se repiten.

1. **`proxy.ts` y `basic-auth.ts` son compartidos con Saltapalabras.** El `matcher`
   `['/admin/:path*', '/api/admin/:path*']` (#4) ya cubre `/admin/juego` y `/api/admin/juego`, que la
   spec de Saltapalabras va a agregar. Por eso `src/lib/admin/basic-auth.ts` no sabe nada de fotos:
   exporta `checkBasicAuth(header, env)` → `ok | missing_config | unauthorized`, y
   `unauthorizedResponse()`. Cada Route Handler de `/api/admin/*` llama a la misma función (#4,
   AC-E1-3). Next permite **un solo** `proxy.ts` por proyecto (doc `01-getting-started/16-proxy.md`):
   si Saltapalabras necesita lógica propia en el proxy, se agrega como módulo importado desde este
   archivo, no como otro proxy.
2. **Lo que dicen los docs de Next 16 sobre el proxy**, leídos para este plan
   (`03-api-reference/03-file-conventions/proxy.md`):
   - Va en `src/proxy.ts`, al mismo nivel que `app/`.
   - **Corre en Node.js por defecto** y no acepta la opción `runtime`: se puede usar `node:crypto`
     (`timingSafeEqual`) sin tocar configuración.
   - Sin `matcher` correría en **todas** las rutas, incluidos `_next/static`, `_next/image` y
     `public/`. El `matcher` es constante (se analiza en el build) y es lo que garantiza AC-E1-4.
   - Con proxy activo, Next **clona y guarda en memoria el cuerpo** de la petición hasta
     `proxyClientMaxBodySize`, **10 MB** por defecto (doc `proxyClientMaxBodySize.md`). La foto llega
     reducida a < 3 MB (#6), así que no se toca esa opción.
3. **Orden de chequeos en el proxy y en el handler:** primero la configuración (faltan variables →
   `503`, AC-E1-2), después las credenciales (`401`, AC-E1-1). Así un despliegue sin variables nunca
   queda abierto ni pide una contraseña que no existe.
4. **Comparación en tiempo constante:** se hashea con SHA-256 lo recibido y lo esperado y se compara
   con `timingSafeEqual`. Comparar los hashes evita el error de `timingSafeEqual` con largos distintos
   sin filtrar el largo.
5. **GitHub sin SDK** (#3): `src/lib/admin/github.ts` envuelve cinco llamadas con `fetch` —leer
   archivo, leer ref, crear blob, crear tree con `base_tree`, crear commit, actualizar ref con
   `force: false`— y recibe `fetch` por argumento para los tests. El conflicto (#11) es el `422` de
   «not a fast forward» al actualizar el ref; se traduce a `version_conflict`. Ojo: también salta si un
   dev hizo push a `main` en el medio. Es correcto (el editor recarga y ve lo nuevo).
6. **El JSON se escribe con el formato de Prettier.** CI corre `pnpm format:check` en cada push, y
   `JSON.stringify(data, null, 2)` no coincide con Prettier en arrays cortos (`"sourceIds": ["a", "b"]`
   va en una línea). **Decidido el 2026-11-17 (spec decisión #14):** formatear en el servidor con
   `prettier/standalone` + `prettier/plugins/babel` (parser `json`). `prettier` pasa de
   `devDependencies` a `dependencies`. Se descartó un serializador propio que imite a Prettier.
   - **No** se agrega `src/data/` a `.prettierignore`: sería bajar el nivel de CONSTRAINTS.md.
7. **Medidas con `image-size`** (#7), condicionado a T0.1. Si `osv-scanner` lo rechaza: leer las
   medidas del marcador SOF del JPEG a mano (el servidor solo acepta JPEG, #6.3), con tests sobre
   fixtures reales.
8. **Reducción en el navegador en un módulo aparte** (`resize-image.ts`): la parte pura (calcular las
   medidas de destino, validar tipo y tamaño de entrada) se testea en Vitest; la parte de `canvas` no
   corre en jsdom y se ejerce en e2e con la ruta `POST` interceptada (`page.route`), comprobando que
   lo enviado es `image/jpeg` y ≤ 2400 px.
9. **Miniaturas de lo no publicado** (spec §5): las fotos ya desplegadas se ven desde `public/`; una
   recién guardada todavía no existe en el despliegue. Como el repo es **público**, se usa la URL
   _raw_ de GitHub del archivo en `main`. Si eso molesta por el caché de _raw_ (unos minutos), se
   muestra un recuadro «Pendiente de publicar» en su lugar. Sin rutas nuevas para servir imágenes.
10. **`peoples:check` dentro del build** (#9): `"build": "pnpm peoples:check && next build"`. Vercel
    usa el script `build` del `package.json`, y el `webServer` de Playwright también, así que la
    validación corre en los dos lados sin otro cambio.
11. **Autor del commit** (#12): nombre «Edición de fotos», correo `noreply` del dueño del token.
    El `commit-msg` hook (commitlint) es local y no corre en commits de la API; el mensaje se arma en
    código con un tipo permitido (`chore`) y un test lo verifica contra `commitlint.config.mjs`.
12. **Página servidor, editor cliente:** `page.tsx` es de servidor (metadata `noindex`, AC-E1-5) y
    monta `photo-editor.tsx`, que es el único `"use client"` de la feature. El editor lee y guarda vía
    `/api/admin/fotos`; el navegador reenvía las credenciales de Basic Auth solo (mismo origen).

## 4. Riesgos

| Riesgo                                                                                                 | Prob. | Impacto | Mitigación                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------ | ----- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `image-size` (o alguna dependencia de la opción elegida para Prettier) no pasa `osv-scanner`           | Baja  | Medio   | **T0.1, primera tarea.** CONSTRAINTS.md exige cero vulnerabilidades; si falla, plan B de §3.7 (leer SOF a mano). No se agrega un `ignoreUntil` para esquivarlo. |
| `canvas.toBlob('image/jpeg')` no produce JPEG en algún navegador, o no respeta la calidad              | Baja  | Medio   | **T0.2** en Chrome, Firefox y Safari (iOS incluido). El servidor rechaza todo lo que no sea JPEG (`photo_invalid`), así que un fallo no llega al repo.          |
| El JSON escrito por el servidor no tiene el formato de Prettier → CI rojo en `main` tras cada guardado | Alta  | Medio   | **T0.3** decide §3.6. Test que compara la salida contra `prettier.format`.                                                                                      |
| Cada guardado es un push a `main`: dispara un despliegue de Vercel **y** la CI completa                | Alta  | Bajo    | Aceptado: la edición es esporádica. CI cancela la corrida anterior de la misma rama (`concurrency`). Se documenta en `docs/edicion-fotos-pruebas.md`.           |
| **Preview escribe en `main`** (mismas variables): una prueba en Preview publica en producción          | Alta  | Medio   | Probar con una foto marcada «PRUEBA» y quitarla al terminar (H3). Opción si molesta: `GITHUB_BRANCH` distinta en Preview; se decide en H2.                      |
| La foto de 12 MP tarda en reducirse en celulares viejos                                                | Media | Bajo    | Indicador de progreso; se mide en H3 con un celular real.                                                                                                       |
| Basic Auth sin «cerrar sesión»: el navegador recuerda las credenciales                                 | Alta  | Bajo    | Aceptado en el spec (§4). Se dice en la página: «Para salir, cierra el navegador».                                                                              |
| El token vence antes del fin del proyecto y el guardado empieza a fallar                               | Media | Medio   | `401` de GitHub → mensaje «La edición no está disponible. Avisa al equipo técnico» (no el error crudo). Fecha de vencimiento anotada en H1.                     |
| Cobertura de líneas cambiadas < 80 % por el código de `canvas` (no corre en jsdom)                     | Media | Bajo    | §3.8: aislar lo puro; el resto se cubre en e2e. Hoy el umbral avisa (`--warn`), pero se apunta a cumplirlo igual.                                               |

### 4.1 Resultados de F0 (2026-11-18)

| Tarea | Resultado                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T0.1  | `image-size@2.1.0` agregado (sin dependencias propias). `osv-scanner` **no está instalado** en la máquina de desarrollo: `pnpm check:deps` solo avisa, y el veredicto con el escáner queda para CI. Consulta directa a la API de OSV (`api.osv.dev/v1/query`) para `image-size@2.1.0` y `prettier@3.9.6`: **sin vulnerabilidades conocidas**. No hace falta el plan B (§3.7).                                         |
| T0.2  | Playwright 1.63, imagen de 4000×3000 con ruido (peor caso para JPEG) → `toBlob('image/jpeg', 0.85)` tras reducir a 2400 px. **Chromium 153, Firefox 155 y WebKit 26.6:** `image/jpeg`, 2400×1800, 2,20 / 2,52 / 2,24 MB, **sin segmento EXIF**. Las tres por debajo de 3 MB. **Falta**: Safari macOS e iOS reales (WebKit de Playwright en Windows es una aproximación); se cubre en H3 con un celular.               |
| T0.3  | `prettier` movido a `dependencies`. `prettier/standalone` + `plugins/babel` + `plugins/estree` con `parser: "json"` reproduce **byte a byte** `ashaninka.json` tal como está en git (LF). `JSON.stringify(…, null, 2)` **no** lo reproduce, como se esperaba. Nota: con `core.autocrlf=true` el archivo en disco tiene CRLF en Windows; la comparación vale contra el contenido de git, que es lo que escribe la API. |

## 5. Puertas humanas

| #   | Cuándo      | Quién / qué                                                                                                                                                  |
| --- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| H1  | Antes de F2 | La persona dueña del repo crea el _fine-grained token_: solo `ouracademy/living-langs-peru`, _Contents: Read and write_, vencimiento al cierre del proyecto. |
| H2  | Antes de F2 | Cargar `ADMIN_USER`, `ADMIN_PASSWORD`, `GITHUB_TOKEN` (Sensitive), `GITHUB_REPOSITORY`, `GITHUB_BRANCH` en Vercel (Production + Preview) y en `.env.local`.  |
| H3  | En F4       | Prueba manual en Preview siguiendo `docs/edicion-fotos-pruebas.md`: agregar, editar, ordenar y quitar una foto «PRUEBA», incluido desde un celular.          |
| H4  | En F4       | Entregar la contraseña al editor por un canal privado (no en el repo, no en un issue).                                                                       |

Sin H1 y H2, F1 se termina igual; F2 en adelante se construye y se testea con `fetch` simulado, pero
no se prueba contra el repo real.

## 6. Definición de terminado (cada tarea)

1. `pnpm check:fast` en verde tras editar.
2. `pnpm check:task` en verde al cerrar la tarea.
3. Los criterios `AC-…` de la tarea pasan, y están citados en el commit o en el test.
4. Código en inglés, texto para personas en español (`pnpm check:language`).
5. Commit en Conventional Commits, un commit por tarea, con las líneas de atribución del proyecto.

Al cerrar la feature, además: `pnpm check:full`, `pnpm build` con `/ashaninka` estática (`○`) y
`/admin/fotos` y `/api/admin/fotos` dinámicas (`ƒ`), y la prueba real de punta a punta (H3).

## 7. Cambios en archivos existentes

- `package.json`: `build` corre `peoples:check` antes de `next build` (§3.10); `image-size` (y quizá
  `prettier` en `dependencies`, §3.6) según F0.
- `src/lib/peoples/validate.ts`: se **reusa** `validatePeople`; no se modifica salvo que haga falta
  exportar algo más.
- `specs/edicion-fotos.md` y `specs/README.md`: estado `aprobado` al empezar, `implementado` al
  cerrar F4. Si F0 cambia una decisión (#6, #7), se actualiza el spec en la misma tarea.

El resto son archivos nuevos (spec §3.1). No se toca `src/data/peoples/ashaninka.json` a mano: el
primer cambio a ese archivo lo hace la prueba de H3.
