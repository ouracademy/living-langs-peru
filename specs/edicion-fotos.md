# Edición de fotos (formulario `/admin/fotos` que guarda en Supabase)

> Estado: **borrador** · Fecha: 2026-11-17, actualizada el 2026-11-18 · Rama: `integracion`
> Rama base: `main` · Plan: [tasks/edicion-fotos/](../tasks/edicion-fotos/) · Índice:
> [specs/README.md](./README.md)
> Reemplaza a: [biblioteca-medios.md](./biblioteca-medios.md) (obsoleta, ver §2 #1).
> Depende de: el modelo de fotos de [ashaninka.md](./ashaninka.md) (`Photo`, `peoples:check`) y del
> mismo proyecto de Supabase que [solicitudes.md](./solicitudes.md) y [saltapalabras.md](./saltapalabras.md).

### Cambios del 2026-11-18

La persona del proyecto pidió que guardar **se vea al instante** y no depender de un token de
GitHub. Supabase ya está en uso para el juego, así que las fotos pasan ahí. Lo que cambia:

| Antes (2026-11-17)                                         | Ahora                                                                                                                       |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Cada guardado era un commit en GitHub (decisiones #3, #12) | La foto va a Supabase Storage y la lista a una fila de Postgres (#2, #3)                                                    |
| Se veía en la web tras recompilar (1–2 min)                | Se ve en segundos: guardar invalida la caché de `/ashaninka` (#15)                                                          |
| Token de GitHub (#5)                                       | La misma clave secreta de Supabase que usa el juego                                                                         |
| Concurrencia por `sha` del commit (#11)                    | Concurrencia por `version` de la galería (#11)                                                                              |
| JSON formateado con Prettier antes del commit (#14)        | Ya no aplica: nada se escribe en el repo. `prettier` vuelve a `devDependencies`                                             |
| El historial de git era la copia de seguridad              | No hay copia automática (plan gratis). Quitar una foto borra el archivo para siempre (#18)                                  |
| `ashaninka.json` era la fuente                             | Es el **respaldo**: lo que se ve si Supabase no está configurado o falla, y el punto de partida de la primera edición (#17) |

Los ID de criterios eliminados quedan marcados; no se renumera nada.

---

## 1. Objetivo

Un editor del equipo quiere **subir fotos** a la galería de `/ashaninka` sin pedírselo a un dev. El
proyecto dura unos meses y se edita poco, así que se construye lo mínimo que resuelve eso: **una
página protegida con un formulario** que guarda la foto en **Supabase Storage** y la lista de la
galería en **una fila de Postgres**. Guardar invalida la caché de la página pública, que muestra el
cambio en segundos.

La web pública sigue siendo estática para el visitante: `/ashaninka` se sirve desde la caché y las
imágenes pasan por `next/image` en Vercel. Si Supabase no está configurado o falla, la galería se ve
con las fotos de `src/data/peoples/ashaninka.json`.

`/admin` y su Basic Auth (`src/proxy.ts`, `src/lib/admin/basic-auth.ts`) se **comparten** con
`/admin/juego` de [Saltapalabras](./saltapalabras.md): un solo acceso para todo lo que edita el equipo.

**Usuarios**

| Usuario        | Necesidad                                                                   |
| -------------- | --------------------------------------------------------------------------- |
| Editor (1 o 2) | Agregar, ordenar, corregir y quitar fotos de la galería desde el navegador. |
| Dev            | No ser el cuello de botella, sin sumar servicios que mantener.              |
| Visitante      | Nada nuevo: la página carga igual que hoy.                                  |

**Qué NO es este trabajo**

- No edita textos, el diccionario, los juegos ni la foto de portada (pregunta P2).
- No sube videos (van a YouTube cuando haga falta; es otra spec) ni audios.
- No hay cuentas individuales: un usuario y contraseña compartidos para el equipo de edición.
- No hay borradores ni aprobación: guardar publica.
- No suma servicios: usa el mismo proyecto de Supabase que el formulario de solicitudes y el juego.
- No mueve al bucket las 5 fotos que ya están en `public/` (decisión #17).

---

## 2. Decisiones tomadas

| #   | Decisión                      | Elección                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Alcance mínimo**            | Proyecto de pocos meses con edición esporádica (decisión del equipo, 2026-11-17). Se descartan la biblioteca con login (`biblioteca-medios.md`) y TinaCMS. El 2026-11-18 el guardado pasa de GitHub a Supabase (ver «Cambios»).                                                                                                                                                                                                                                                                                                                                                                           |
| 2   | **Dónde se guarda**           | Cada foto nueva en el bucket **público** `gallery` de Supabase Storage (`ashaninka/<aaaa-mm-dd>-<6 al azar>.jpg`). La lista completa de la galería, en **una fila** de la tabla `galleries` (`slug`, `version`, `photos` jsonb), con el mismo formato que `photos` de `ashaninka.json`. _Antes: en el repo._                                                                                                                                                                                                                                                                                              |
| 3   | **Cómo se guarda**            | El servidor, con la clave secreta de Supabase: (1) sube la foto al bucket; (2) aplica la acción a la lista y la valida (#9); (3) guarda la lista entera con la función SQL `save_gallery`, que comprueba la versión esperada y la incrementa en una transacción; (4) si se quitó una foto del bucket, borra su archivo. Si (3) falla, borra lo que subió en (1). Una fila con la lista entera, y no una fila por foto: es la misma unidad que hoy valida `validatePeople`, agregar, editar, ordenar y quitar son un solo camino, y no hay posiciones que renumerar. _Antes: commit con la API de GitHub._ |
| 4   | **Acceso**                    | **HTTP Basic Auth** en `src/proxy.ts` para `/admin/:path*` y `/api/admin/:path*`, con `ADMIN_USER` y `ADMIN_PASSWORD` en variables de entorno. El Route Handler **vuelve a comprobar** las credenciales: el `matcher` del proxy no es la única barrera.                                                                                                                                                                                                                                                                                                                                                   |
| 5   | ~~**Token de GitHub**~~       | **Eliminada el 2026-11-18.** No hay token: el servidor usa `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`, las mismas que el juego y las solicitudes.                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 6   | **Tamaño de la foto**         | El navegador la **reduce y recodifica** a JPEG (lado mayor ≤ 2400 px, calidad 0,85) antes de enviarla. Así pesa < 2 MB, entra holgada en el límite de cuerpo de las funciones de Vercel y en el búfer del proxy (10 MB por defecto), y **se pierden los metadatos EXIF**, GPS incluido.                                                                                                                                                                                                                                                                                                                   |
| 7   | **Medidas**                   | El servidor lee `width` y `height` del archivo recibido con `image-size`. No confía en lo que manda el navegador.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 8   | **Ruta, no Server Action**    | La subida va a un **Route Handler** `POST /api/admin/fotos` con `multipart/form-data`. Las Server Actions limitan el cuerpo a 1 MB por defecto y no hace falta tocar esa configuración.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 9   | **Validación**                | Antes de guardar, el servidor arma la lista nueva y corre **la misma validación que `peoples:check`** (`validatePeople`). Si falla, no se guarda nada. `peoples:check` sigue dentro de `pnpm build` para el JSON de respaldo.                                                                                                                                                                                                                                                                                                                                                                             |
| 10  | **Lectura del estado actual** | `/admin/fotos` lee la fila de `galleries` **sin caché**, en cada visita. Si todavía no hay fila, muestra las fotos de `ashaninka.json` con `version` 0: el primer guardado crea la fila a partir de ellas. _Antes: desde GitHub._                                                                                                                                                                                                                                                                                                                                                                         |
| 11  | **Dos guardados a la vez**    | Cada guardado manda la `version` que leyó. Si la galería cambió entre medio, `save_gallery` rechaza el guardado (`40001`) y el editor ve «Alguien guardó antes. Recarga y vuelve a intentar». Nada se pierde. _Antes: el `sha` del commit._                                                                                                                                                                                                                                                                                                                                                               |
| 12  | ~~**Mensaje del commit**~~    | **Eliminada el 2026-11-18:** no hay commits.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 13  | **Lengua del código**         | Código, claves y códigos de error en inglés (`photo_invalid`, `version_conflict`); URL y textos en español (`/admin/fotos`, «Agregar foto»).                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 14  | ~~**Formato del JSON**~~      | **Eliminada el 2026-11-18:** nada se escribe en el repo. `prettier` vuelve a `devDependencies`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 15  | **Lectura pública**           | `/ashaninka` lee la galería en el servidor con `unstable_cache` (etiqueta `gallery:ashaninka`, `revalidate` de 1 hora como red) y sigue `○` en `next build`. Guardar llama a `revalidateTag("gallery:ashaninka", "max")`, **nunca** `revalidatePath`: si Supabase falla justo al regenerar, `revalidatePath` puede dejar un 500, y con la etiqueta Next sigue sirviendo la última página buena (hallazgo F0 de Saltapalabras).                                                                                                                                                                            |
| 16  | **Respaldo**                  | Sin variables de Supabase, o sin fila todavía, la galería pública usa las `photos` de `ashaninka.json`. Si la lectura **falla**: durante `next build` y en `next dev` se usa el respaldo (el build y CI no dependen de Supabase); en producción la lectura lanza, y Next sigue sirviendo la última página buena en vez de reemplazarla por el respaldo.                                                                                                                                                                                                                                                   |
| 17  | **Fotos existentes**          | Las 5 fotos de hoy **se quedan en `public/`** y la fila las referencia con su ruta local. No hay script de migración: la primera edición copia la lista del JSON a la fila (#10). Mover esos archivos al bucket no aporta nada al visitante y agrega un paso manual.                                                                                                                                                                                                                                                                                                                                      |
| 18  | **Quitar es definitivo**      | Quitar una foto subida al bucket borra su archivo; una de `public/` solo sale de la lista (el archivo queda en el repo). El plan gratis de Supabase no tiene copias, así que la confirmación lo dice: «No se puede deshacer».                                                                                                                                                                                                                                                                                                                                                                             |
| 19  | **Imágenes remotas**          | `next.config.ts` agrega **un solo** `images.remotePatterns`, derivado de `SUPABASE_URL` al compilar y acotado a `/storage/v1/object/public/gallery/**`. Sin la variable, no hay patrón. El visitante nunca se conecta a Supabase: `next/image` descarga la foto en Vercel.                                                                                                                                                                                                                                                                                                                                |

---

## 3. Mapa de capacidades

| Id  | Capacidad                                    | Depende de | Se verifica con                                                |
| --- | -------------------------------------------- | ---------- | -------------------------------------------------------------- |
| E1  | Acceso con Basic Auth                        | —          | Tests del chequeo de credenciales + e2e sin credenciales       |
| E2  | Ver la galería actual (lectura de Supabase)  | E1         | Tests con Supabase simulado                                    |
| E3  | Guardar: agregar, editar, ordenar, quitar    | E2         | Tests de la ruta con Supabase simulado + prueba manual         |
| E4  | La galería pública lee Supabase con respaldo | —          | Tests de la lectura + `next build` (`○`) + e2e con el respaldo |

**Fases verticales:** E1 + E2 (ver la galería) → E3 «agregar» → E3 «editar, ordenar, quitar» →
E4 (la página pública muestra lo guardado). La fase F5 del plan pasa E2–E4 de GitHub a Supabase.

### 3.1 Archivos

```
src/proxy.ts                               # Basic Auth para /admin/:path* y /api/admin/:path*
src/lib/admin/basic-auth.ts                # comparación en tiempo constante, compartida por proxy y handler
src/lib/supabase-optional.ts               # cliente de servidor, o null si faltan las variables
src/lib/peoples/gallery-store.ts           # leer la fila, guardar con save_gallery, subir y borrar archivos
src/lib/peoples/gallery-photos.ts          # lectura pública cacheada con respaldo (E4)
src/lib/admin/gallery.ts                   # aplicar una acción a la lista y validarla (puro)
src/lib/admin/gallery-source.ts            # lectura para /admin/fotos (sin caché, con punto de partida)
src/app/admin/fotos/page.tsx               # página (servidor) + noindex
src/components/admin/photo-editor.tsx      # formulario y lista (cliente)
src/components/admin/resize-image.ts       # reducción y recodificación en el navegador
src/app/api/admin/fotos/route.ts           # GET estado actual · POST / PATCH / DELETE guardar
docs/edicion-fotos-schema.sql              # tabla, función, permisos y bucket (se corre a mano)
src/lib/peoples/validate.ts                # ya existe: se reusa, no se copia
```

---

## 4. E1 — Acceso

- `proxy.ts` con `matcher: ['/admin/:path*', '/api/admin/:path*']`. Sin cabecera `Authorization`
  válida → `401` con `WWW-Authenticate: Basic realm="Edición", charset="UTF-8"`.
- Credenciales comparadas en tiempo constante (`crypto.timingSafeEqual` sobre los hashes).
- Si faltan `ADMIN_USER` o `ADMIN_PASSWORD` en el entorno → `/admin` responde `503` («Edición no
  configurada»), nunca queda abierto.
- `/admin/fotos` lleva `robots: { index: false }` y no se enlaza desde el sitio.
- Cambiar la contraseña = cambiar la variable en Vercel y volver a desplegar. Basic Auth no tiene
  «cerrar sesión»: se cierra el navegador.

| ID      | Criterio                                                                                                 |
| ------- | -------------------------------------------------------------------------------------------------------- |
| AC-E1-1 | Sin credenciales o con credenciales incorrectas, `GET /admin/fotos` y `POST /api/admin/fotos` dan `401`. |
| AC-E1-2 | Con las variables de entorno ausentes, `/admin/fotos` da `503` y no muestra el formulario.               |
| AC-E1-3 | El Route Handler rechaza con `401` aunque se lo llame sin pasar por el proxy (test directo del handler). |
| AC-E1-4 | El proxy no corre en ninguna otra ruta: `/`, `/ashaninka` y `/_next/*` no reciben la cabecera `401`.     |
| AC-E1-5 | `/admin/fotos` lleva `noindex` y ninguna página pública la enlaza.                                       |

---

## 5. E2 — Ver la galería actual

- `GET /api/admin/fotos` y la página leen la fila `galleries` de `ashaninka` sin caché y devuelven
  `photos` y `version`. Sin fila, `photos` de `ashaninka.json` y `version` 0 (#10).
- La página muestra cada foto con su miniatura (`next/image`), descripción, pie y crédito, en el
  orden guardado.

| ID      | Criterio                                                                                                                                                                            |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-E2-1 | Sin fila en `galleries`, la página muestra las 5 fotos de `ashaninka.json` en su orden; con fila, las de la fila en su orden. _Antes: «en el orden de `ashaninka.json` en `main`»._ |
| AC-E2-2 | Si Supabase no está configurado o no responde, la página dice «No pudimos leer la galería» y no muestra un formulario vacío que invite a pisar el contenido.                        |

---

## 6. E3 — Guardar

### 6.1 Acciones

| Acción      | Cambia                                                        | En Supabase                                                    |
| ----------- | ------------------------------------------------------------- | -------------------------------------------------------------- |
| **Agregar** | Una foto nueva al final de la lista                           | archivo nuevo en `gallery/ashaninka/` + lista nueva en la fila |
| **Editar**  | Descripción, pie o crédito de una foto (no el archivo)        | lista nueva en la fila                                         |
| **Ordenar** | El orden de la lista (subir / bajar, accesible con teclado)   | lista nueva en la fila                                         |
| **Quitar**  | Saca una foto de la lista y, si está en el bucket, su archivo | lista nueva en la fila + borrado del archivo (#18)             |

### 6.2 Flujo de «Agregar»

1. El editor elige la imagen y llena la **descripción** (alt). **Autor** y **licencia** vienen
   prellenados con el crédito del equipo («Living Langs Peru» · «Foto del equipo») y se pueden
   cambiar; si quedan vacíos, se usa ese mismo crédito. El **pie** y la **URL de origen** son
   opcionales. Solo la foto y la descripción son obligatorias.
2. El navegador acepta JPEG, PNG o WebP, la reduce a ≤ 2400 px y la recodifica a JPEG.
3. `POST /api/admin/fotos` con la imagen, los datos y la `version` leída.
4. El servidor: comprueba credenciales → lee medidas con `image-size` → genera el nombre
   `<aaaa-mm-dd>-<6 caracteres al azar>.jpg` → sube al bucket → arma la lista nueva → valida con
   `validatePeople` → `save_gallery` → invalida `gallery:ashaninka`.
5. Respuesta: «Foto guardada. Ya está en la galería.» con enlace a `/ashaninka`.

### 6.3 Límites

- Imagen recibida por el servidor: JPEG, ≤ 3 MB, lado mayor ≤ 2400 px. Lo demás → `photo_invalid`.
  El bucket también limita a `image/jpeg` y 3 MB.
- Galería: como máximo 24 fotos (`gallery_full`); la función SQL también lo comprueba.
- Textos: descripción 10–300 caracteres, pie ≤ 200, autor y licencia ≤ 120. La URL de origen es
  **opcional**; si viene, tiene que ser `https://`. Sin URL, el crédito se guarda sin `url` y la
  galería muestra «Autor · Licencia» como texto, sin enlace.

> **Nota (2026-11-18).** La persona del proyecto pidió pedir pocos datos: «algunas fotos no tienen
> dirección de origen». Desde ese día solo la foto y la descripción son obligatorias; autor y
> licencia tienen el crédito del equipo por defecto, y `PhotoCredit.url` es opcional en todo el sitio
> (`src/lib/peoples/types.ts`, `validatePeople`, `photo-gallery.tsx`). La interfaz se describe en
> [docs/edicion-fotos-ui.md](../docs/edicion-fotos-ui.md).

### 6.4 Criterios de aceptación

| ID       | Criterio                                                                                                                                                                                                                                                                                |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-E3-1  | Agregar una foto de 8 MB (12 MP) sube **un** JPEG ≤ 2400 px y < 3 MB a `gallery/ashaninka/` y guarda la lista con la foto nueva al final, con `src` igual a la URL pública del archivo. _Antes: «un solo commit»._                                                                      |
| AC-E3-2  | El JPEG guardado no tiene metadatos EXIF (ni GPS).                                                                                                                                                                                                                                      |
| AC-E3-3  | `width` y `height` guardados son los del archivo, aunque el navegador mande otros.                                                                                                                                                                                                      |
| AC-E3-4  | Sin descripción, con una descripción genérica («foto») o con una URL que no es `https://`, el servidor responde `photo_invalid` y **no** sube ni guarda nada. Autor y licencia vacíos se guardan como «Living Langs Peru» · «Foto del equipo»; sin URL, el crédito se guarda sin `url`. |
| AC-E3-5  | Con una `version` vieja (alguien guardó antes), la respuesta es `version_conflict`, la fila no cambia, el archivo recién subido se borra y el editor ve el aviso de recargar. _Antes: `sha`._                                                                                           |
| AC-E3-6  | Quitar una foto del bucket la saca de la lista y borra su archivo; quitar una de `public/` solo la saca de la lista. _Antes: «en el mismo commit»._                                                                                                                                     |
| AC-E3-7  | Ordenar con teclado (botones «Subir» / «Bajar») funciona y se guarda.                                                                                                                                                                                                                   |
| AC-E3-8  | Un JSON de respaldo inválido en `main` (por un cambio manual) hace fallar `pnpm build`, y Vercel deja publicada la versión anterior.                                                                                                                                                    |
| AC-E3-9  | Después de un guardado, `/ashaninka` muestra el cambio **sin desplegar** (como tarde en la segunda visita, por la revalidación `"max"`) y sigue siendo `○` en `next build`. _Antes: «en el siguiente despliegue»._                                                                      |
| AC-E3-10 | Los logs registran la acción y la versión nueva, nunca la clave de Supabase ni las credenciales. _Antes: «el `sha` del commit»._                                                                                                                                                        |
| AC-E3-11 | Una llamada directa a la tabla `galleries` o al bucket con la clave pública (`anon`) no puede leer la tabla ni escribir en el bucket (SQL + prueba manual).                                                                                                                             |

---

## 6.5 E4 — La galería pública

| ID      | Criterio                                                                                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-E4-1 | Sin variables de Supabase, `pnpm build && pnpm start` sirve `/ashaninka` como `○` con las 5 fotos de `ashaninka.json` (e2e de CI).                                  |
| AC-E4-2 | Con una fila en `galleries`, `/ashaninka` muestra sus fotos en su orden, con su crédito.                                                                            |
| AC-E4-3 | Si la lectura falla durante `next build`, el build termina y usa el respaldo; en producción la lectura lanza y no reemplaza la última página buena (test unitario). |
| AC-E4-4 | `next.config.ts` tiene como máximo **un** `remotePatterns`, acotado a `/storage/v1/object/public/gallery/**` del host de `SUPABASE_URL`.                            |

---

## 7. Seguridad

- La clave secreta de Supabase y las credenciales de edición solo existen en el servidor
  (variables sin `NEXT_PUBLIC_`). `pnpm check:secrets` sigue limpio.
- La tabla `galleries` tiene RLS sin políticas y `grant` solo a `service_role`; la función
  `save_gallery` solo la ejecuta `service_role`. El bucket es público para leer y no tiene políticas de
  escritura: solo el servidor sube y borra.
- Alcance del daño si se filtra la contraseña de edición: alguien puede cambiar o quitar fotos de la
  galería. Sin historial ni copias (plan gratis), una foto del bucket quitada no se recupera; las 5
  originales siguen en el repo y `ashaninka.json` permite rehacer la lista.
- El nombre del archivo lo genera el servidor; el del editor no llega al bucket.

---

## 8. Pruebas

- **Unitarias:** `basic-auth`; `gallery` (cada acción y su validación); `gallery-store` y
  `gallery-photos` con un cliente de Supabase simulado (fila, sin fila, error, conflicto, respaldo en
  build y en dev, lanzar en producción); `route.ts` (401, `photo_invalid`, `version_conflict`, éxito,
  borrado del archivo subido si falla el guardado, borrado al quitar).
- **SQL:** `docs/edicion-fotos-schema.test.sql` comprueba la función (versión, conflicto, tope de 24) y
  que `anon` no lee ni escribe.
- **Componente:** el formulario no envía sin foto o sin descripción; ordenar con teclado.
- **E2E en CI:** `401` sin credenciales (AC-E1-1), páginas públicas sin cambios (AC-E1-4), la galería
  con el respaldo (AC-E4-1) y el formulario contra el Supabase falso de `tests/e2e/fake-supabase.mjs`.
- **Manual** (`docs/edicion-fotos-pruebas.md`): agregar, editar, ordenar y quitar una foto de prueba
  contra el Supabase real. **Ojo:** local, Preview y producción usan la misma base; se prueba con una
  foto marcada «PRUEBA» y se quita al terminar.

---

## 9. Configuración

**Supabase** (a mano, una vez): correr `docs/edicion-fotos-schema.sql` en el _SQL Editor_. Crea la
tabla, la función, los permisos y el bucket `gallery`.

**Vercel** (Production y Preview) y `.env.local`:

```bash
ADMIN_USER=...
ADMIN_PASSWORD=...                  # larga y al azar
SUPABASE_URL=https://<proyecto>.supabase.co   # solo el dominio
SUPABASE_SERVICE_ROLE_KEY=...       # la secreta (sb_secret_… o service_role), nunca la publishable
```

`GITHUB_TOKEN`, `GITHUB_REPOSITORY` y `GITHUB_BRANCH` ya no se usan.

---

## 10. Preguntas abiertas

| #   | Pregunta                                               | Si no hay respuesta                                                                                             |
| --- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| P1  | ¿Quién reparte la contraseña de edición?               | La persona dueña del proyecto. _(El 2026-11-18 deja de haber token de GitHub.)_                                 |
| P2  | ¿La foto de **portada** también debe editarse?         | No en v1. Requiere mover la imagen de `hero.tsx` a un JSON y saber su crédito (autor y licencia de `/ash.jpg`). |
| P3  | ¿Hace falta otra galería (otro pueblo) en estos meses? | No. La tabla tiene `slug`, pero solo se habilita `ashaninka`.                                                   |
