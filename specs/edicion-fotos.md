# Edición de fotos (formulario `/admin/fotos` que publica en el repo)

> Estado: **borrador** · Fecha: 2026-11-17 · Rama sugerida: `feat/edicion-fotos`
> Rama base: `main` · Plan: [tasks/edicion-fotos/](../tasks/edicion-fotos/) · Índice:
> [specs/README.md](./README.md)
> Reemplaza a: [biblioteca-medios.md](./biblioteca-medios.md) (obsoleta, ver §2 #1).
> Depende de: el modelo de fotos de [ashaninka.md](./ashaninka.md) (`Photo`, `peoples:check`). No toca
> Supabase.

---

## 1. Objetivo

Un editor del equipo quiere **subir fotos** a la galería de `/ashaninka` sin pedírselo a un dev. El
proyecto dura unos meses y se edita poco, así que se construye lo mínimo que resuelve eso: **una
página protegida con un formulario** que guarda la foto y sus datos **en el repo**, con un commit.
Vercel publica solo, como con cualquier otro cambio.

No hay base de datos, ni almacenamiento externo, ni cuentas. La web pública no cambia: sigue
leyendo `src/data/peoples/ashaninka.json` y `public/` al compilar.

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
- No hay borradores ni aprobación: guardar publica (en 1–2 minutos, lo que tarde Vercel).
- No usa Supabase, Cloudflare, TinaCMS ni otro servicio nuevo.

---

## 2. Decisiones tomadas

| #   | Decisión                      | Elección                                                                                                                                                                                                                                                                                                          |
| --- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Alcance mínimo**            | Proyecto de pocos meses con edición esporádica (decisión del equipo, 2026-11-17). Se descartan la biblioteca con login y Supabase Storage (`biblioteca-medios.md`) y TinaCMS.                                                                                                                                     |
| 2   | **Dónde se guarda**           | En el repo, como hoy: la imagen en `public/peoples/ashaninka/` y sus datos en `src/data/peoples/ashaninka.json`. Git es el historial y la copia de seguridad.                                                                                                                                                     |
| 3   | **Cómo se guarda**            | El servidor hace **un commit** en `main` con la **API de GitHub** (Git Data API: blob → tree → commit → actualizar ref). Imagen y JSON van en el **mismo** commit: nunca queda una foto sin datos ni datos sin foto. Sin dependencias: `fetch` a `api.github.com`.                                                |
| 4   | **Acceso**                    | **HTTP Basic Auth** en `src/proxy.ts` para `/admin/:path*` y `/api/admin/:path*`, con `ADMIN_USER` y `ADMIN_PASSWORD` en variables de entorno. El Route Handler **vuelve a comprobar** las credenciales: el `matcher` del proxy no es la única barrera.                                                           |
| 5   | **Token de GitHub**           | _Fine-grained personal access token_ limitado a **este repo**, con permiso **Contents: read and write** y nada más, vencimiento al terminar el proyecto. En Vercel como `GITHUB_TOKEN`, marcado _Sensitive_. Solo lo lee el servidor.                                                                             |
| 6   | **Tamaño de la foto**         | El navegador la **reduce y recodifica** a JPEG (lado mayor ≤ 2400 px, calidad 0,85) antes de enviarla. Así pesa < 2 MB, entra holgada en el límite de cuerpo de las funciones de Vercel y en el búfer del proxy (10 MB por defecto), y **se pierden los metadatos EXIF**, GPS incluido.                           |
| 7   | **Medidas**                   | El servidor lee `width` y `height` del archivo recibido con `image-size` (una dependencia nueva, sin dependencias propias; se aprueba con esta spec). No confía en lo que manda el navegador.                                                                                                                     |
| 8   | **Ruta, no Server Action**    | La subida va a un **Route Handler** `POST /api/admin/fotos` con `multipart/form-data`. Las Server Actions limitan el cuerpo a 1 MB por defecto y no hace falta tocar esa configuración.                                                                                                                           |
| 9   | **Validación**                | Antes del commit, el servidor arma el JSON nuevo y corre **la misma validación que `peoples:check`** (`validatePeople`). Si falla, no hay commit. Además `peoples:check` pasa a correr dentro de `pnpm build`, así un JSON roto nunca se publica.                                                                 |
| 10  | **Lectura del estado actual** | La página lee `ashaninka.json` **desde GitHub** (no del build desplegado), para mostrar lo último guardado aunque Vercel todavía esté publicando.                                                                                                                                                                 |
| 11  | **Dos guardados a la vez**    | Cada guardado manda el `sha` del commit que leyó. Si `main` cambió entre medio, GitHub rechaza la actualización (sin `force`) y el editor ve «Alguien guardó antes. Recarga y vuelve a intentar». Nada se pierde.                                                                                                 |
| 12  | **Mensaje del commit**        | `chore: update ashaninka gallery (<acción>)`, en Conventional Commits, como pide AGENTS.md. Autor: «Edición de fotos».                                                                                                                                                                                            |
| 13  | **Lengua del código**         | Código, claves y códigos de error en inglés (`photo_invalid`, `version_conflict`); URL y textos en español (`/admin/fotos`, «Agregar foto»).                                                                                                                                                                      |
| 14  | **Formato del JSON**          | El servidor formatea `ashaninka.json` con **Prettier** (`prettier/standalone`, la misma configuración del repo) antes del commit. `JSON.stringify` no coincide con Prettier y `format:check` dejaría la CI en rojo en cada guardado. `prettier` pasa de `devDependencies` a `dependencies` (aprobado 2026-11-17). |

---

## 3. Mapa de capacidades

| Id  | Capacidad                                    | Depende de | Se verifica con                                          |
| --- | -------------------------------------------- | ---------- | -------------------------------------------------------- |
| E1  | Acceso con Basic Auth                        | —          | Tests del chequeo de credenciales + e2e sin credenciales |
| E2  | Ver la galería actual (lectura desde GitHub) | E1         | Tests con la API de GitHub simulada                      |
| E3  | Guardar: agregar, editar, ordenar, quitar    | E2         | Tests del armado del commit + prueba manual en Preview   |

**Fases verticales:**

1. E1 + E2: el editor entra a `/admin/fotos` y ve la galería tal como está en `main`. Sin
   credenciales, el navegador pide usuario y contraseña.
2. E3 «agregar»: sube una foto con sus datos y, 1–2 minutos después, aparece en `/ashaninka`.
3. E3 «editar, ordenar, quitar».

### 3.1 Archivos

```
src/proxy.ts                               # Basic Auth para /admin/:path* y /api/admin/:path*
src/lib/admin/basic-auth.ts                # comparación en tiempo constante, compartida por proxy y handler
src/lib/admin/github.ts                    # leer archivo, commit atómico de varios archivos (fetch)
src/lib/admin/gallery.ts                   # aplicar una acción al JSON y validarlo (puro)
src/app/admin/fotos/page.tsx               # página (servidor) + noindex
src/components/admin/photo-editor.tsx      # formulario y lista (cliente)
src/components/admin/resize-image.ts       # reducción y recodificación en el navegador
src/app/api/admin/fotos/route.ts           # GET estado actual · POST guardar
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

- `GET /api/admin/fotos` lee `src/data/peoples/ashaninka.json` de `main` con la API de GitHub y
  devuelve `photos` y el `sha` del commit leído.
- La página muestra cada foto (miniatura servida por GitHub _raw_ o, si ya está publicada, la de
  `public/`), con descripción, pie y crédito, en el orden actual.
- Un aviso explica que los cambios tardan 1–2 minutos en verse en la web.

| ID      | Criterio                                                                                                                                                    |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-E2-1 | La página muestra las 5 fotos actuales, en el orden de `ashaninka.json` en `main`.                                                                          |
| AC-E2-2 | Si GitHub no responde o el token es inválido, la página dice «No pudimos leer la galería» y no muestra un formulario vacío que invite a pisar el contenido. |

---

## 6. E3 — Guardar

### 6.1 Acciones

| Acción      | Cambia                                                      | Archivos del commit                     |
| ----------- | ----------------------------------------------------------- | --------------------------------------- |
| **Agregar** | Una foto nueva al final de la lista                         | imagen nueva + `ashaninka.json`         |
| **Editar**  | Descripción, pie o crédito de una foto (no el archivo)      | `ashaninka.json`                        |
| **Ordenar** | El orden de la lista (subir / bajar, accesible con teclado) | `ashaninka.json`                        |
| **Quitar**  | Saca una foto de la lista y borra su archivo                | `ashaninka.json` + borrado de la imagen |

### 6.2 Flujo de «Agregar»

1. El editor elige la imagen y llena la **descripción** (alt). **Autor** y **licencia** vienen
   prellenados con el crédito del equipo («Living Langs Peru» · «Foto del equipo») y se pueden
   cambiar; si quedan vacíos, se usa ese mismo crédito. El **pie** y la **URL de origen** son
   opcionales. Solo la foto y la descripción son obligatorias (cambio del 2026-11-18, ver nota).
2. El navegador acepta JPEG, PNG o WebP, la reduce a ≤ 2400 px y la recodifica a JPEG.
3. `POST /api/admin/fotos` con la imagen, los datos y el `sha` leído.
4. El servidor: comprueba credenciales → lee medidas con `image-size` → genera el nombre
   `<aaaa-mm-dd>-<6 caracteres al azar>.jpg` → arma el JSON nuevo → valida con `validatePeople` →
   commit atómico.
5. Respuesta: «Foto guardada. Se verá en la web en 1–2 minutos.» con enlace a `/ashaninka`.

### 6.3 Límites

- Imagen recibida por el servidor: JPEG, ≤ 3 MB, lado mayor ≤ 2400 px. Lo demás → `photo_invalid`.
- Galería: como máximo 24 fotos (`gallery_full`).
- Textos: descripción 10–300 caracteres, pie ≤ 200, autor y licencia ≤ 120. La URL de origen es
  **opcional**; si viene, tiene que ser `https://`. Sin URL, el JSON no lleva la clave `url` y la
  galería muestra «Autor · Licencia» como texto, sin enlace.

> **Nota (2026-11-18).** La persona del proyecto pidió pedir pocos datos: «algunas fotos no tienen
> dirección de origen». Desde ese día solo la foto y la descripción son obligatorias; autor y
> licencia tienen el crédito del equipo por defecto, y `PhotoCredit.url` es opcional en todo el sitio
> (`src/lib/peoples/types.ts`, `validatePeople`, `photo-gallery.tsx`). La interfaz se describe en
> [docs/edicion-fotos-ui.md](../docs/edicion-fotos-ui.md).

### 6.4 Criterios de aceptación

| ID       | Criterio                                                                                                                                                                                                                                                                                     |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-E3-1  | Agregar una foto de 8 MB (12 MP) produce **un solo commit** con un JPEG ≤ 2400 px y < 3 MB en `public/peoples/ashaninka/` y su entrada en el JSON.                                                                                                                                           |
| AC-E3-2  | El JPEG guardado no tiene metadatos EXIF (ni GPS).                                                                                                                                                                                                                                           |
| AC-E3-3  | `width` y `height` del JSON son los del archivo guardado, aunque el navegador mande otros.                                                                                                                                                                                                   |
| AC-E3-4  | Sin descripción, con una descripción genérica («foto») o con una URL que no es `https://`, el servidor responde `photo_invalid` y **no** hace commit. Autor y licencia vacíos se guardan como «Living Langs Peru» · «Foto del equipo»; sin URL, el crédito se guarda sin `url` (2026-11-18). |
| AC-E3-5  | Con un `sha` viejo (alguien guardó antes), la respuesta es `version_conflict`, no hay commit y el editor ve el aviso de recargar.                                                                                                                                                            |
| AC-E3-6  | Quitar una foto borra la entrada y el archivo en el mismo commit; `peoples:check` sigue pasando.                                                                                                                                                                                             |
| AC-E3-7  | Ordenar con teclado (botones «Subir» / «Bajar») funciona y se guarda.                                                                                                                                                                                                                        |
| AC-E3-8  | Un JSON inválido en `main` (por un cambio manual) hace fallar `pnpm build`, y Vercel deja publicada la versión anterior.                                                                                                                                                                     |
| AC-E3-9  | Después de un guardado, `/ashaninka` muestra el cambio en el siguiente despliegue y sigue siendo `○` en `next build`.                                                                                                                                                                        |
| AC-E3-10 | Los logs registran la acción y el `sha` del commit, nunca el token ni las credenciales.                                                                                                                                                                                                      |

---

## 7. Seguridad

- El token de GitHub y las credenciales de edición solo existen en el servidor (variables sin
  `NEXT_PUBLIC_`). `pnpm check:secrets` sigue limpio.
- Alcance del daño si se filtra la contraseña de edición: alguien puede cambiar fotos de la galería.
  Se ve en el historial de git y se revierte con un commit. Si se filtra el token: puede escribir en
  el repo; se revoca en GitHub y se genera otro.
- Los commits van directo a `main` sin pasar por CI. Por eso la validación corre **antes** del
  commit (decisión #9) y otra vez **en el build**.
- El nombre del archivo lo genera el servidor; el del editor no llega al repo.

---

## 8. Pruebas

- **Unitarias:** `basic-auth` (correcto, incorrecto, ausente, variables vacías), `gallery` (cada
  acción y su validación), `github` con `fetch` simulado (commit atómico, conflicto por `sha`),
  `route.ts` (401, `photo_invalid`, `version_conflict`, éxito).
- **Componente:** el formulario no envía sin foto o sin descripción; ordenar con teclado.
- **E2E en CI:** `401` sin credenciales (AC-E1-1) y páginas públicas sin cambios (AC-E1-4). La API
  de GitHub no se llama desde CI.
- **Manual en Preview** (`docs/edicion-fotos-pruebas.md`): agregar, editar, ordenar y quitar una
  foto de prueba contra el repo real. **Ojo:** Preview escribe en `main` igual que producción; se
  prueba con una foto marcada «PRUEBA» y se quita al terminar.

---

## 9. Configuración

**GitHub:** _Settings → Developer settings → Fine-grained tokens_: solo este repo, _Contents:
Read and write_, vencimiento al cierre del proyecto.

**Vercel** (Production y Preview):

```bash
ADMIN_USER=...
ADMIN_PASSWORD=...          # larga y al azar
GITHUB_TOKEN=...            # Sensitive
GITHUB_REPOSITORY=<dueño>/<repo>
GITHUB_BRANCH=main
```

---

## 10. Preguntas abiertas

| #   | Pregunta                                                                  | Si no hay respuesta                                                                                             |
| --- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| P1  | ¿Quién genera y guarda el token de GitHub, y quién reparte la contraseña? | La persona dueña del repo.                                                                                      |
| P2  | ¿La foto de **portada** también debe editarse?                            | No en v1. Requiere mover la imagen de `hero.tsx` a un JSON y saber su crédito (autor y licencia de `/ash.jpg`). |
| P3  | ¿Hace falta otra galería (otro pueblo) en estos meses?                    | No. El código recibe el pueblo como parámetro, pero solo se habilita `ashaninka`.                               |
