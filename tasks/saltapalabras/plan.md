# Plan de implementación — Saltapalabras

> Spec: [specs/saltapalabras.md](../../specs/saltapalabras.md) · Fecha: 2026-11-17 · Rama base: `main`
> Lista de tareas ejecutable: [tasks/saltapalabras/todo.md](./todo.md)
> El spec sigue en `borrador`: este plan se escribe antes de la aprobación por pedido de la persona
> del proyecto. Si la revisión cambia una decisión, se ajusta la tarea afectada, no el plan entero.

---

## 1. Cómo se corta el trabajo

El mapa del spec (§3) tiene seis capacidades vigentes: SP1 formato, SP2 motor de ronda, SP3 biblioteca
en Supabase, SP4 página del juego, SP5 acceso `/admin`, SP6 administración de paquetes y SP8 audio.
Tomadas por capas, primero se escribiría todo el formato, después todo el motor de los cinco modos,
y recién al final alguien jugaría. Este plan corta **vertical**:

```
F0 verificaciones (ISR con [], revalidar desde un Route Handler, caché que no se pisa,
   bundle sin Supabase, Supabase falso para e2e, permisos de la función SQL)
        │
        ▼
F1a una ronda de un solo modo (pic2word) de punta a punta, sin login, leyendo de Supabase
        │
        ▼
F1b los otros tres modos sin audio (word2pic, first, vowel), progreso local, accesibilidad completa
        │
        ▼
F2 /admin/juego: importar, probar, publicar, historial, restaurar  (depende de /admin de edicion-fotos)
        │
        ▼
F3 audio: subir por ítem, botón de sonido, ronda «escuchar»
        │
        ▼
F4 cierre: pruebas contra Supabase real, docs, check:full
```

Las etiquetas `SP1..SP8` se conservan en cada tarea para trazar con el spec.

**Por qué F1 se parte en dos.** El spec define F1 como «SP1–SP4: jugar». Entero, son el esquema, cuatro
modos, el reducer, la lectura cacheada, la página, el canvas y la accesibilidad: semanas antes de ver
una ronda. F1a lleva **un** modo por todo el camino (JSON en Supabase → `parsePack` →
`playableThemes` → página ISR → botones → resumen) y deja probado lo más riesgoso del diseño: la
lectura en el servidor con caché y el e2e sin Supabase real. F1b agrega lo que es más de lo mismo.

**Por qué hay una F0.** Seis cosas pueden invalidar el diseño del spec antes de escribir código de
producto, y todas se comprueban en horas con una ruta descartable o un Postgres local (§3.1). Si una
falla, cambia la decisión correspondiente del spec, no el plan.

## 2. Orden y dependencias

| Fase | Capacidades                  | Depende de                   | Qué se puede mostrar al terminar                                                                                                  |
| ---- | ---------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| F0   | —                            | —                            | Seis hallazgos anotados en este plan (§3.1). Nada se mergea.                                                                      |
| F1a  | SP1, SP2, SP3 (lectura), SP4 | F0, H1                       | Con el Supabase falso, se abre `/juegos/saltapalabras/ashaninka`, se juega una ronda `pic2word` y se llega al resumen. Sin login. |
| F1b  | SP1, SP2, SP4                | F1a                          | Los cuatro modos sin audio, progreso que sobrevive a recargar, ronda completa con teclado.                                        |
| F2   | SP3 (publicar), SP5, SP6     | F1b, **E1 de edicion-fotos** | Desde `/admin/juego` se importa un paquete, se prueba, se publica y la página pública lo muestra.                                 |
| F3   | SP8                          | F2, H4                       | Se adjunta un audio a un ítem, se publica y la ronda «escuchar» se juega.                                                         |
| F4   | todo                         | F1–F3                        | `pnpm check:full` en verde y el checklist manual de `docs/saltapalabras-pruebas.md` registrado.                                   |

**Dependencia externa: el acceso `/admin` (SP5).** `src/proxy.ts` y `src/lib/admin/basic-auth.ts` los
entrega `edicion-fotos` en su F1 (tareas T1.1 y T1.2 de
[tasks/edicion-fotos/todo.md](../edicion-fotos/todo.md)). Este plan **no** los vuelve a planificar:

- Si ya están en `main` cuando empiece F2: se reusan tal cual; T2.1 solo agrega los tests de
  AC-SP5-8 a AC-SP5-10 sobre las rutas de `/admin/juego`.
- Si F2 llega antes: se implementan **exactamente** T1.1 y T1.2 de edicion-fotos (mismos archivos,
  mismas firmas, mismos AC-E1-1 a AC-E1-5) en un commit propio, y se marcan hechas en **los dos**
  `todo.md`. No se crea una variante (spec §8, decisión #17).
- El `matcher` (`/admin/:path*`, `/api/admin/:path*`) ya cubre `/admin/juego` y
  `/api/admin/juego/**`: no se toca.

## 3. Decisiones de implementación

Lo que el spec deja abierto o que solo se ve al escribir el código.

### 3.1 Lo que F0 tiene que confirmar

Leído en `node_modules/next/dist/docs/` (Next 16.2, **sin** Cache Components):

- `generate-static-params.md`, «All paths at runtime»: devolver `[]` hace que ninguna ruta se
  renderice en el build y cada una se genere estática en su primera visita; es además **requisito**
  para revalidar (ISR) rutas generadas en tiempo de ejecución. Con Cache Components, `[]` sería un
  error de build: por eso el spec prohíbe activarlo sin preguntar (§13).
- `incremental-static-regeneration.md`: «If an error is thrown while attempting to revalidate data,
  the last successfully generated data will continue to be served from the cache. On the next
  subsequent request, Next.js will retry». Es la base de la decisión #8 y de AC-SP3-11.
- `revalidateTag.md`: con `profile="max"` la entrada queda vieja y se regenera en la siguiente visita
  (la primera visita tras publicar todavía ve la anterior). Se puede llamar desde Route Handlers.
  `updateTag.md`: **solo** Server Actions; no aplica (spec §6.4).
- `unstable_cache.md`: acepta `tags` y `revalidate`; está marcado como reemplazado por `use cache`,
  que exige Cache Components.

Lo que los docs no dicen y F0 comprueba con una ruta descartable (no se commitea):

1. **Qué marca muestra la tabla de `pnpm build`** para `[lengua]` con `generateStaticParams → []` y
   `revalidate = 3600`. AC-SP4-1 pide «no `ƒ`»; si Next 16.2 la muestra de otra forma, se ajusta el
   texto del AC con lo observado, no el diseño.
2. **`revalidateTag(tag, "max")` + `revalidatePath(path)` desde un Route Handler** invalidan tanto la
   entrada de `unstable_cache` como la página ISR, y la segunda visita ve el dato nuevo (AC-SP6-11).
3. **Una lectura que lanza dentro de `unstable_cache`** no reemplaza la entrada buena ni la página
   generada, y un error en la primera visita no queda en caché (decisión #8, AC-SP3-7, AC-SP3-11).
4. **El bundle del cliente no contiene** la URL de Supabase ni claves (AC-SP3-12): se define el
   chequeo (§3.6).
5. **Playwright con dos `webServer`** (Supabase falso + Next) arranca en el orden correcto y no rompe
   los e2e que ya existen (§3.2).
6. **Permisos de la función SQL** (§3.4): con los `grant` del spec §6.1 la función no puede escribir;
   se confirma en un Postgres 16 local y se corrige el SQL.

#### Resultados de F0 (2026-11-18)

Medido con una ruta descartable (`generateStaticParams → []`, `unstable_cache` con etiqueta y un
upstream HTTP propio que se podía hacer fallar), `next build` + `next start` en local. La ruta se
borró después; nada de F0 queda en `src/`.

| #   | Qué                              | Resultado                                                                                                                                                                                                                                                                                                                                                                                           |
| --- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Marca en la tabla de build       | `/juegos/saltapalabras/[lengua]` sale **`●` (SSG) sin rutas listadas**, no `ƒ`. La biblioteca, `○`. Cumple AC-SP4-1 tal como está escrito. Primera visita `x-nextjs-cache: MISS` (1 lectura), siguientes `HIT` (ninguna).                                                                                                                                                                           |
| 2   | Revalidar desde un Route Handler | `revalidateTag(tag, "max")` **solo**: primera visita `STALE` con el dato viejo y regeneración en segundo plano; la segunda ya trae el nuevo. Cumple AC-SP6-11. `revalidatePath`: **descarta** la página y la siguiente visita regenera en primer plano (`MISS`, dato nuevo en la primera).                                                                                                          |
| 3a  | Revalidación que falla           | Por **tiempo** y por **`revalidateTag` solo**: se sigue sirviendo la última página buena (`STALE`), y al volver el upstream se actualiza. Con **`revalidatePath`**: la visita siguiente responde **500**. ⇒ publicar llama **solo** a `revalidateTag` (spec §6.4 corregida, T2.3).                                                                                                                  |
| 3b  | Error en la primera visita       | 500 (en la página real, `error.tsx`), **no queda en caché**: la visita siguiente reintenta y, con el upstream de vuelta, genera la página (`MISS` → `HIT`).                                                                                                                                                                                                                                         |
| 4   | Chequeo del bundle               | `tests/e2e/bundle-leaks.ts` sobre `.next/static`: limpio con el build real; con un archivo plantado que contiene `https://….supabase.co/rest/v1/…` reporta `/rest/v1` y `supabase.co`. Se probó plantando el archivo en una copia, no con un segundo build.                                                                                                                                         |
| 5   | Petición real de `maybeSingle()` | `supabase-js` 2.117.3 hace `GET /rest/v1/language_packs?select=version%2Cpack%2Cpublished_at&language=eq.<slug>` con `Accept: */*`, `apikey` y `Authorization: Bearer`. Respuesta: un **arreglo** JSON (`[]` → `data: null`; un elemento → el objeto); un 500 llega como `error`. El falso imita eso.                                                                                               |
| 6   | Permisos SQL                     | En un Postgres **18.3** local (no había 16; el SQL no usa nada específico de versión) con roles `anon`, `authenticated` y `service_role` simulados: con los `grant` del spec, `permiso denegado a la tabla language_packs` en el `select … for update`. Con los de §3.4, `docs/saltapalabras-schema.test.sql` pasa entero, y falla si se le abre una tabla a `anon` (prueba de que el test muerde). |

Otro hallazgo, fuera de la lista: **un build dentro de un worktree mezclaba ramas.** Con dos
`pnpm-lock.yaml` (el del repo y el del worktree), Turbopack tomó el repo exterior como raíz y
resolvió _su_ `src/proxy.ts`. Se fijó `turbopack.root` en `next.config.ts` (doc
`next-config-js/turbopack.md`, «Root directory»). En `main` no cambia nada: la raíz es la misma.

### 3.2 E2E sin Supabase real (AC-SP4-2): un Supabase falso por HTTP

La persona del proyecto delegó el mecanismo al plan. La lectura del paquete ocurre **en el servidor**
de Next, así que `page.route` (lo que usa `support-request.spec.ts` para `/api/solicitudes`) no la
ve: intercepta solo lo que pide el navegador.

| Opción                                                                                                                                                           | A favor                                                                                                                                                            | En contra                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Servidor HTTP mínimo que imita las rutas de PostgREST y Storage que usamos**, lanzado como primer `webServer` de Playwright, con `SUPABASE_URL` apuntándole | **Cero código de test en producción**: `library.ts` y `supabase-js` corren igual que en producción y se ejercita la petición real. Sin dependencias (`node:http`). | Hay que imitar unas pocas respuestas de PostgREST (cabecera `Accept` de objeto único, formato de error). Si `supabase-js` cambia su formato, el falso se actualiza. |
| B. Adaptador de fuente de datos inyectable por variable de entorno (p. ej. `WORD_JUMP_PACKS_FROM=file`)                                                          | Simple de escribir                                                                                                                                                 | Mete en producción una rama que solo existe para tests y que podría activarse por error. Viola la condición del pedido.                                             |
| C. Interceptar `fetch` dentro del proceso de Next (`instrumentation.ts` + `MockAgent` de undici)                                                                 | No hace falta otro proceso                                                                                                                                         | `instrumentation.ts` es código de producción; mismo problema que B.                                                                                                 |

**Se elige A.** `tests/e2e/fake-supabase.mjs` (Node puro, `node:http`, sin dependencias):

- `GET /rest/v1/language_packs?…language=eq.<slug>` → el paquete de `tests/e2e/fixtures/` o `[]` /
  `406` según lo que pida `supabase-js` para `maybeSingle()` (se fija en T0.5 mirando la petición
  real).
- `POST /rest/v1/rpc/publish_language_pack` y `GET /rest/v1/pack_versions?…` para F2;
  `POST /storage/v1/object/audio/…` para F3. Guardan en memoria.
- Cualquier otra ruta → `404`. Ninguna clave se valida: la clave de e2e es un texto fijo sin valor.
- **Los fixtures usan palabras marcadas como de prueba** (`"PRUEBA perro"`, `"PRUEBA uno"`), nunca
  lengua real inventada (spec §13).

`playwright.config.ts` pasa a un arreglo de `webServer`: primero el falso (puerto fijo, p. ej.
`54329`), después `pnpm build && pnpm start` con `env` = `SUPABASE_URL=http://127.0.0.1:54329`,
`SUPABASE_SERVICE_ROLE_KEY=e2e-not-a-key`, `ADMIN_USER` / `ADMIN_PASSWORD` de e2e. Es configuración
de tests, no del workflow de CI; si la revisión lo considera «cambiar CI» (spec §13), se pregunta en
T0.5.

**Lo que este mecanismo no cubre en e2e, y cómo se cubre:** con un solo servidor de Next y una sola
lengua jugable (`languages.ts` tiene `ashaninka` y `uro`, y uro nunca tiene paquete), no se puede
probar en la misma corrida «la primera visita funciona» y «la primera visita falla». Por eso:

- AC-SP4-8 (sin variables / falla en la primera visita): la decisión de qué mostrar se extrae a una
  función pura `resolveGameState(readResult)` con tests unitarios, y `error.tsx` tiene test de
  componente. El build sin variables se prueba aparte (AC-SP3-10, T1.12).
- AC-SP3-11 (Supabase empieza a fallar después): test de integración de `library.ts` + prueba manual
  pausando el proyecto (F4).

### 3.3 Una lengua sin paquete por diseño no consulta la base

`uro` no tiene hablantes ni alfabeto (decisión #5). La página lo resuelve con una constante en código
(`LANGUAGES_WITHOUT_PACK`) y **no** llama a `getPublishedPack`. Así AC-SP4-9 no depende de Supabase y
la biblioteca puede decir «sin paquete» sin leer la base (spec §6.4).

### 3.4 Permisos de la función de publicación (corrige el SQL del spec)

El spec §6.1 concede a `service_role` solo `select` sobre las tablas y `execute` sobre la función, y
§6.2 dice que la función **no** es `security definer`. Así la función corre con los permisos de quien
la llama y **no puede** insertar en `pack_versions` ni hacer el `upsert` en `language_packs`.
`service_role` ignora RLS pero no los `grant`. Se elige lo más simple que mantiene la regla «nadie
más que el servidor»:

- `grant select, insert, update on language_packs to service_role`
- `grant select, insert on pack_versions to service_role` (nunca `update` ni `delete`: el historial
  es inmutable)
- la función sigue sin `security definer`.

T0.6 lo confirma en un Postgres 16 local y T1.7 actualiza el spec §6.1 con el `grant` correcto.

### 3.5 Lectura cacheada (SP3)

- `library.ts` lleva `import "server-only"` y recibe el cliente por argumento (spec §11.3); la
  función exportada que usa la página lo toma de `getSupabaseAdmin()`.
- `readPublishedPack` devuelve `{ status: "unconfigured" } | { status: "none" } | { status: "ok", pack }`
  y **lanza** ante error o respuesta malformada. `null` no se usa como valor de error (AC-SP3-7).
- Antes de `getSupabaseAdmin()` se comprueban las variables: `getSupabaseAdmin` hoy **lanza** si
  faltan, y `unconfigured` no debe lanzar (AC-SP3-8).
- `audioBaseUrl` para `validatePack` se arma en el servidor a partir de `SUPABASE_URL`
  (`<url>/storage/v1/object/public/audio/`). Las URLs de audio viajan dentro del paquete (HTML /
  payload RSC), no en el bundle.

### 3.6 Chequeo del bundle (AC-SP3-12)

Un test e2e (corre después de `pnpm build`) recorre `.next/static/**` con `node:fs` y falla si
encuentra `127.0.0.1:54329`, `supabase.co`, `/rest/v1`, `SUPABASE_SERVICE_ROLE_KEY` o el texto de la
clave de e2e. Sin dependencias. Complementa a AC-SP4-13, que mira las peticiones del navegador.

### 3.7 Componentes y `"use client"`

- `src/components/word-jump/` son cliente (canvas, ronda, feedback, resumen). La página
  `[lengua]/page.tsx` es servidor: lee, filtra con `playableThemes` y pasa el paquete ya filtrado.
- `error.tsx` **tiene que ser** componente cliente (convención de Next). El spec §11.3 limita
  `"use client"` a `word-jump/` y `pack-admin/`: `error.tsx` es la excepción obligada y se anota en
  el spec en T1.10.
- Se reusa `mulberry32`, `shuffle` (`src/lib/game/random.ts`) y `hash` (`src/lib/game/hash.ts`), y
  `src/components/game/unavailable-game.tsx` si su texto sirve; si no, se copia el patrón, no el
  archivo.

### 3.8 `/admin/juego` (SP6)

- Route Handlers, no Server Actions (spec §9.1). Cada uno llama a `checkBasicAuth` **otra vez**.
- El paquete en preparación vive en memoria + `localStorage` (`living-langs:pack-admin:v1:<lengua>`).
  Un paquete de casi 2 MB entra en la cuota habitual de `localStorage` (≈ 5 MB por origen), pero si
  `setItem` falla se avisa «no se pudo guardar una copia local» y se sigue trabajando.
- «Probar» reusa los componentes de `word-jump/` con un modo `preview` que muestra también los ítems
  sin verificar, marcados. Nunca pasa por `playableThemes` y nunca escribe progreso.

### 3.8b Editor mínimo (SP6b, 2026-11-20)

- **Lógica pura** en `src/lib/language-packs/edit-pack.ts`: `updateItem`, `verifyTheme`,
  `addItem`, `removeItem` y `checkItemFields` (palabra y traducción no vacías, emoji corto).
  Ninguna toca React ni el storage; devuelven un paquete nuevo, así el editor solo llama a
  `setDraft` del store que ya existe (T2.6). Un cambio de palabra, traducción, emoji o
  verificada se aplica a **todas** las apariciones de la misma palabra (`normalizeWord`), no del
  `id`: al importar, `cleanPack` da un `id` distinto a la misma palabra en cada tema
  (spec §9.5 E2).
- **Una palabra nueva** entra sin `id` y pasa por `cleanPack`, que asigna uno sin tocar los
  existentes (spec §4.2). Así no hay una segunda regla de ids.
- **UI** en `src/components/admin/pack-admin/`: `pack-editor.tsx` (tema, búsqueda, filtros, lista),
  `editor-row.tsx` (fila con casilla y edición en línea), `add-item-form.tsx` y
  `verify-theme.tsx` (acción masiva con confirmación). Reemplaza la lista de solo lectura
  `pack-items.tsx`.
- **Enlaces de los avisos** (E4): el editor escucha `hashchange` y el hash inicial; si apunta a un
  ítem de otro tema o oculto por un filtro, cambia de tema, quita los filtros y lleva el foco a la
  fila. Los enlaces de `pack-issues.tsx` no cambian.
- **Riesgo:** un tema de 169 palabras con campos por fila. Por eso la edición se abre por fila
  (E5): la lista son textos y una casilla; los campos existen solo en la fila abierta.

### 3.9 Audio (SP8)

- `<audio preload="none">` con `src` asignado recién al pulsar el botón, para no depender de que cada
  navegador respete `preload="none"` (AC-SP8-8).
- El bucket se crea a mano (H4) con límite de tamaño y tipos MIME (AC-SP8-2 «en el bucket»), además
  del chequeo en el Route Handler.

### 3.10 Pruebas SQL

`docs/saltapalabras-schema.test.sql` se escribe en F1a y se corre **a mano** sobre un Postgres 16
local (Docker o instalación) con _stubs_ de los roles `anon`, `authenticated` y `service_role`; la
fecha y el resultado se anotan en `docs/saltapalabras-pruebas.md`. Llevarlo a CI es la pregunta 3 del
spec: no se toca `.github/workflows/` sin respuesta.

## 4. Riesgos

| Riesgo                                                                                                                        | Prob. | Impacto | Mitigación                                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------- | ----- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La función de publicación no puede escribir con los `grant` del spec                                                          | Alta  | Alto    | §3.4. T0.6 lo prueba en Postgres local antes de H1; el SQL se corrige antes de pegarlo en Supabase.                                                                               |
| `unstable_cache` guarda un resultado de error o una revalidación fallida pisa la página buena                                 | Media | Alto    | T0.3 antes de escribir `library.ts`. `readPublishedPack` lanza, nunca devuelve un valor «vacío» por error.                                                                        |
| La marca de la tabla de build no coincide con AC-SP4-1                                                                        | Media | Bajo    | T0.1 la observa y ajusta el texto del AC.                                                                                                                                         |
| `revalidateTag` desde un Route Handler no invalida la página ISR                                                              | Baja  | Medio   | T0.2. Si falla, `revalidatePath` solo, o publicar redirige con `?v=`; se decide con lo observado.                                                                                 |
| El Supabase falso diverge de PostgREST real y un e2e pasa en verde con un bug real                                            | Media | Medio   | El falso imita respuestas copiadas de peticiones reales (T0.5), y F4 prueba contra Supabase real con el checklist manual.                                                         |
| Cambiar `playwright.config.ts` a dos `webServer` rompe los e2e existentes o se considera «cambiar CI»                         | Baja  | Medio   | T0.5 corre la suite entera; si la revisión lo ve como cambio de CI, se pregunta antes de mergear.                                                                                 |
| **Preview y producción comparten la base** (decisión #11 de solicitudes): publicar un paquete de prueba lo muestra al público | Alta  | Alto    | **Nunca** se publica un paquete de prueba en Supabase real. Las pruebas de publicación van contra el falso; en real solo se publica el paquete verificado (H3).                   |
| No hay paquete real verificado cuando el código está listo                                                                    | Media | Medio   | F1 se puede mergear igual: la página muestra «aún no disponible». H3 corre en paralelo desde el inicio.                                                                           |
| Supabase gratis se pausa (7 días sin actividad) durante el desarrollo o en producción                                         | Alta  | Medio   | Riesgo aceptado (pregunta 10). Lo ya generado sigue sirviéndose. H6 documenta cómo reactivar.                                                                                     |
| Algún navegador descarga el audio pese a `preload="none"`                                                                     | Baja  | Bajo    | §3.9: el `src` se asigna al pulsar.                                                                                                                                               |
| `localStorage` lleno al guardar un paquete grande en `/admin/juego`                                                           | Baja  | Bajo    | §3.8: se avisa y se sigue; «Exportar» es el respaldo.                                                                                                                             |
| Cobertura del cambio < 80 % por el canvas (jsdom no dibuja)                                                                   | Media | Bajo    | La lógica del salto (posiciones, estados) va en funciones puras con tests; el componente canvas queda delgado. No se agregan comentarios de exclusión de cobertura (CONSTRAINTS). |
| Contenido inventado o generado con IA en fixtures o en la base                                                                | Baja  | Alto    | Regla «Nunca» del spec §13. Fixtures con «PRUEBA»; el único paquete real es el de H3.                                                                                             |

## 5. Puertas humanas

| #   | Cuándo                 | Quién / qué                                                                                                                                                                                                                                                                               |
| --- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | Antes de F1a           | Pegar en el _SQL Editor_ de Supabase el bloque SP3 de `docs/saltapalabras-schema.sql` (ya corregido en T0.6) y anotar la fecha en el archivo. Comprobar en el panel que las tablas no tienen políticas.                                                                                   |
| H2  | Antes de F2            | `ADMIN_USER` / `ADMIN_PASSWORD` cargadas en Vercel (las mismas de edicion-fotos, su H2). Si edicion-fotos aún no las cargó, se cargan aquí.                                                                                                                                               |
| H3  | En paralelo, desde F1a | **Primer paquete asháninka**, armado por el equipo y **verificado con una persona hablante** o con la fuente citada (MINEDU). Nunca palabras inventadas ni generadas con IA (spec §13, pregunta 6). Se publica con la función SQL desde el _SQL Editor_ (F1) o desde `/admin/juego` (F2). |
| H4  | Antes de F3            | Crear el bucket público `audio` con límite de 2 MB y los tipos MIME de spec §6.1; correr el bloque SP8 del SQL.                                                                                                                                                                           |
| H5  | Antes de F3            | Consentimiento de cada hablante para publicar su voz y cómo quiere ser acreditada/o (spec §10). Sin esto no se sube ningún audio real.                                                                                                                                                    |
| H6  | Siempre                | Si Supabase se pausa: _Dashboard → proyecto → Restore_. El paso queda escrito en `docs/saltapalabras-pruebas.md`.                                                                                                                                                                         |
| H7  | Antes de F4            | Leer el párrafo nuevo de la política de privacidad (§8.1) y aprobarlo.                                                                                                                                                                                                                    |
| H8  | En F4                  | Prueba manual en Preview del checklist de `docs/saltapalabras-pruebas.md`, **sin** publicar paquetes de prueba (riesgo de la tabla de §4).                                                                                                                                                |

## 6. Definición de terminado (cada tarea)

1. `pnpm check:fast` en verde tras editar.
2. `pnpm check:task` en verde al cerrar la tarea.
3. Los criterios `AC-…` de la tarea pasan y están citados en el test o en el commit.
4. Código en inglés, texto para personas en español (`pnpm check:language`).
5. Commit en Conventional Commits, uno por tarea.

Al cerrar cada fase, además: `pnpm build` con la tabla de rutas de AC-SP4-1 y `pnpm test:e2e`.
Al cerrar la feature: `pnpm check:full` y el checklist manual registrado.

## 7. Cambios en archivos existentes

- `playwright.config.ts`: arreglo de `webServer` con el Supabase falso (§3.2).
- `src/lib/privacy/policy.ts` + `docs/politica-privacidad.md`: un párrafo (spec §8.1), en F3.
- `specs/saltapalabras.md`: §6.1 (`grant` de §3.4), §11.3 (`error.tsx`) y, si F0 lo pide, el texto de
  AC-SP4-1. `specs/README.md`: estado al cerrar.
- `src/proxy.ts` y `src/lib/admin/basic-auth.ts`: **no** se modifican; se reusan (§2).
- No se tocan `src/lib/dictionary/**`, `src/lib/game/**` (solo se importa), `solicitudes`,
  `supabase-admin.ts`, `help-education.tsx` ni `languages.ts` (spec §13).
