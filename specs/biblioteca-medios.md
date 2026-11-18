# Biblioteca de medios (login de editores, subida de imágenes y videos, edición sobre la página)

> Estado: **obsoleto** · Fecha: 2026-11-17 (escrito y descartado el mismo día, sin código).
> **Motivo:** el proyecto dura unos meses y se edita poco; esto exigía login, Supabase Pro, tablas,
> caché y una isla cliente en todas las páginas. Se reemplaza por [edicion-fotos.md](./edicion-fotos.md)
> (formulario con Basic Auth que hace commit en el repo). Se conserva por si el proyecto se extiende.
> Rama base: `main` · Plan: ninguno · Índice:
> [specs/README.md](./README.md)
> Depende de: el proyecto de Supabase de [solicitudes.md](./solicitudes.md). **Modifica** decisiones de
> [ashaninka.md](./ashaninka.md) (§7.1, AC-M3-4 y AC-M2-15, ver §9).

---

## 1. Objetivo

Hoy cada imagen del sitio es un archivo en `public/` más una entrada en un JSON o una ruta escrita en
un componente. Cambiar una foto exige editar código y desplegar. Este trabajo agrega:

1. Un **login para editores** en `/admin`. Solo entran personas invitadas.
2. Una **biblioteca de medios** donde un editor sube imágenes y videos con su texto alternativo y
   su crédito (autor, licencia y URL).
3. **Edición sobre la página**: con la sesión de editor iniciada, el editor navega el sitio público
   normal y, sobre cada lugar que muestra medios (un _espacio_), ve un botón **«Editar imagen»**.
   Desde ahí elige de la biblioteca, sube algo nuevo o corrige el crédito, y la página se actualiza.

Para un visitante sin sesión no cambia nada: las páginas siguen siendo estáticas, no descargan el
código del editor y siguen funcionando aunque Supabase no responda.

**Usuarios**

| Usuario                 | Necesidad                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------- |
| Editor del proyecto     | Ver la página real y cambiar una foto o un video ahí mismo, sin pedirle nada a un dev.  |
| Administrador (técnico) | Dar y quitar acceso a editores sin tocar código.                                        |
| Visitante               | Ver la página rápido, con créditos visibles y videos con subtítulos, sin código de más. |

**Qué NO es este trabajo**

- No se editan textos, el diccionario, el juego ni los datos de los pueblos. Eso sigue en JSON (o en
  un CMS futuro: es otra spec).
- No hay registro público: la única forma de tener cuenta es que un administrador la cree.
- No hay recuperación de contraseña por correo en v1: la restablece un administrador (decisión #4).
- No hay transcodificación, streaming adaptativo (HLS) ni recorte de imágenes. El video se sirve tal
  como se sube.
- No hay roles distintos: todo editor puede subir, editar, borrar y elegir.
- No hay borradores ni vista previa antes de publicar: guardar publica (ver pregunta P8).
- No se leen las **solicitudes** desde el panel: siguen en el panel de Supabase.
- No cambian los **logos de auspiciadores** (`sponsors.tsx`): son marcas, no medios con licencia.
- No se borran los archivos sueltos sin uso de `public/` (`ashb.jpg`, `ashaninka-c.webp`,
  `ashaninka-Mother-Baby.webp`, `logo.webp`, y los SVG de la plantilla de Next). Se anota para otra
  limpieza.

---

## 2. Decisiones tomadas

| #   | Decisión                                           | Elección                                                                                                                                                                                                                                                                                                                                                               |
| --- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Proveedor**                                      | Todo en el proyecto de Supabase que ya existe: **Auth** para el login, **Postgres** para los metadatos y **Storage** para los archivos. No se suma proveedor ni hace falta cambiar la lista de proveedores de la política de privacidad (sí su texto, ver #13).                                                                                                        |
| 2   | **Plan de Supabase**                               | **Pro es requisito** antes de desplegar: el plan gratis limita a 50 MB por archivo, pausa el proyecto tras una semana sin actividad y no tiene copias de seguridad. Ver §10, pregunta P1.                                                                                                                                                                              |
| 3   | **Quién escribe en la base**                       | Igual que en solicitudes: **solo el servidor**, con la `service_role` key. RLS activado **sin políticas** en las tablas nuevas. Supabase Auth se usa para saber _quién_ es el editor, no para darle acceso directo a las tablas.                                                                                                                                       |
| 4   | **Forma de entrar**                                | Correo y contraseña. El administrador crea la cuenta desde el panel de Supabase con «Auto Confirm User», así **no se envía ningún correo** y no hace falta SMTP propio en v1. El registro público queda **desactivado** en Supabase.                                                                                                                                   |
| 5   | **Rol de editor**                                  | Se guarda en `app_metadata.role = "editor"`, que solo puede escribir el administrador o la `service_role` (el usuario no puede cambiárselo). Una cuenta sin ese rol puede iniciar sesión pero no edita nada.                                                                                                                                                           |
| 6   | **Sesión en Next**                                 | `@supabase/ssr` con cookies. `src/proxy.ts` refresca la sesión y redirige `/admin/*` a `/admin/ingresar` (chequeo optimista). Cada página, Server Action y Route Handler que edita **vuelve a verificar** con `requireEditor()` (DAL), como pide la guía de auth de Next 16.                                                                                           |
| 7   | **Subida directa a Storage**                       | El archivo **no pasa por Vercel**: el servidor emite una URL firmada de subida de un solo uso y el navegador sube directo a Storage. Las funciones de Vercel tienen un límite de cuerpo de unos pocos MB y las Server Actions de 1 MB por defecto; un video no cabe.                                                                                                   |
| 8   | **Bucket**                                         | Un bucket `media`, **público solo para lectura**. Sin políticas de escritura para `anon` ni `authenticated`: escribir solo se puede con la URL firmada que emite el servidor.                                                                                                                                                                                          |
| 9   | **Espacios en código**                             | La lista de espacios (qué páginas, qué tipos aceptan, cuántos elementos) vive en código, en `src/lib/media/slots.ts`. La base guarda **solo qué eligió el editor**. Agregar un espacio nuevo es un cambio de código con su propio criterio de aceptación.                                                                                                              |
| 10  | **Respaldo si falla Supabase**                     | Cada espacio tiene un **contenido por defecto** en el repo (el de hoy). Si Supabase no responde, no hay variables de entorno o el espacio está vacío donde no puede estarlo, la página usa el respaldo. El build de CI no necesita Supabase.                                                                                                                           |
| 11  | **Páginas estáticas**                              | `/` y `/ashaninka` siguen saliendo como `○` en `next build`. El servidor **no** mira la sesión al renderizarlas (leer cookies las volvería dinámicas). La lectura de espacios se cachea con etiquetas y se invalida **bajo demanda** al guardar, más una revalidación de 1 hora. Ver §6.4.                                                                             |
| 12  | **Créditos obligatorios**                          | Toda imagen y todo video lleva `alt` (descripción), autor, licencia y URL. Las mismas reglas que hoy aplica `peoples:check` a las fotos, movidas a un módulo compartido. Sin crédito no se puede guardar.                                                                                                                                                              |
| 13  | **Privacidad**                                     | Los visitantes que miren un **video** se conectan directo a Supabase Storage (las imágenes pasan por `next/image` en Vercel y no). La política se actualiza para decirlo, y para nombrar la cookie de editor (#19), que solo reciben editores.                                                                                                                         |
| 14  | **Subtítulos**                                     | Un video con habla **exige** un archivo de subtítulos WebVTT en español (WCAG 2.1, criterio 1.2.2). Un video sin habla se marca como tal y queda exento. Ver pregunta P3.                                                                                                                                                                                              |
| 15  | **Imagen de portada del video**                    | Todo video exige una imagen de portada (`poster`), subida junto con el video. Evita el salto de diseño y deja `preload="none"` sin pantalla negra.                                                                                                                                                                                                                     |
| 16  | **Borrado**                                        | No se puede borrar un elemento que esté elegido en algún espacio: primero hay que quitarlo de ahí. Borrar elimina la fila y los archivos de Storage.                                                                                                                                                                                                                   |
| 17  | **Lengua del código**                              | Tablas, columnas, ids de espacio y códigos de error en inglés (`media_assets`, `home.hero`, `asset_in_use`). URLs y textos de la UI en español (`/admin/biblioteca`, «Editar imagen»).                                                                                                                                                                                 |
| 18  | **Dónde se elige**                                 | **Sobre la página pública**, no en una pantalla aparte. Reemplaza a la pantalla `/admin/paginas` del primer borrador. `/admin/biblioteca` se queda para gestionar la biblioteca completa (buscar, corregir créditos, borrar).                                                                                                                                          |
| 19  | **Cómo sabe la página estática que hay un editor** | Al iniciar sesión, el servidor deja además una cookie **`ll_editor=1`**, no `httpOnly`, sin datos. Es solo una **pista**: si no está, la página no hace nada más. Si está, pregunta a `GET /api/admin/sesion` (dinámica, `no-store`), que valida de verdad con `requireEditor()`. La pista nunca autoriza nada.                                                        |
| 20  | **Código del editor**                              | Una sola **isla cliente** pequeña en el layout raíz (`InlineMediaEditor`). Para un visitante solo lee una cookie y no renderiza nada. Para un editor carga **por import dinámico** el resto (botones, diálogo, subida), así ese código no viaja a los visitantes. Los espacios no cambian de componente servidor a cliente: solo llevan un atributo `data-media-slot`. |

---

## 3. Mapa de capacidades

Una feature, cuatro capacidades verificables por separado. Las flechas apuntan a la dependencia.

| Id  | Capacidad                                       | Depende de | Se verifica con                                                     |
| --- | ----------------------------------------------- | ---------- | ------------------------------------------------------------------- |
| B1  | Login de editores, protección y pista de sesión | —          | Tests de `requireEditor` y `/api/admin/sesion` + e2e de redirección |
| B2  | Biblioteca: subir, listar, editar, borrar       | B1         | Tests de esquema y acciones (Supabase simulado) + prueba manual     |
| B3  | Edición sobre la página: botones y diálogo      | B2, B4     | Tests de componente del editor + tests de la acción de guardar      |
| B4  | Páginas públicas leen los espacios (+ video)    | —          | Tests de componente, `next build` (`○`), e2e con respaldo           |

Orden: **B4 (lectura con respaldo) → B1 → B2 → B3**. B4 va primero porque deja las páginas
leyendo de espacios sin cambiar nada visible (todo sale del respaldo), y así cada fase siguiente
termina con algo que se ve en la página real:

1. B4: `/` y `/ashaninka` renderizan desde `slots.ts` con respaldo; el sitio se ve igual que hoy.
2. B1: un editor inicia sesión, vuelve a la portada y ve la barra «Modo edición»; un visitante no.
3. B2 + B3 con **una imagen** (`home.hero`): el editor pulsa «Editar imagen», sube o elige una foto
   y la portada la muestra.
4. B3 con **lista mixta** (`ashaninka.gallery`): imágenes, videos, orden, quitar.

### 3.1 Estructura de archivos

```
src/proxy.ts                                  # refresco de sesión + redirect optimista de /admin/*
src/lib/supabase-admin.ts                     # ya existe: cliente service_role
src/lib/supabase/server-auth.ts               # cliente @supabase/ssr con cookies (solo identidad)
src/lib/auth/require-editor.ts                # DAL: getUser() + rol
src/lib/auth/editor-hint.ts                   # nombre y opciones de la cookie ll_editor
src/lib/media/types.ts                        # MediaAsset, ImageAsset, VideoAsset, SlotId…
src/lib/media/schema.ts                       # zod: metadatos, límites de archivo
src/lib/media/credit-rules.ts                 # reglas de alt/crédito, compartidas con peoples:check
src/lib/media/slots.ts                        # registro de espacios + respaldo por defecto
src/lib/media/read-slots.ts                   # lectura cacheada para páginas públicas
src/lib/media/actions.ts                      # Server Actions: createUpload, registerAsset, saveSlot…
src/app/api/admin/sesion/route.ts             # GET { editor: boolean }, no-store
src/app/admin/ingresar/page.tsx               # formulario de login
src/app/admin/(panel)/layout.tsx              # requireEditor() + navegación del panel
src/app/admin/(panel)/biblioteca/page.tsx     # lista, subida, edición, borrado
src/app/layout.tsx                            # monta <InlineMediaEditor /> (único cambio)
src/components/media/media-slot.tsx           # envoltorio servidor: data-media-slot + figura(s)
src/components/media/media-figure.tsx         # imagen o video + crédito
src/components/inline-editor/inline-media-editor.tsx  # isla cliente mínima (lee la pista)
src/components/inline-editor/editor-ui.tsx            # cargado por import dinámico: botones, barra, diálogo
src/components/inline-editor/…                        # selector, uploader, formulario de crédito
docs/media-schema.sql                         # SQL para pegar en Supabase, como solicitudes
scripts/seed-media.ts                         # importa las fotos actuales a la biblioteca
```

---

## 4. B1 — Login de editores

### 4.1 Flujo

1. `/admin/*` sin sesión → `proxy.ts` redirige a `/admin/ingresar?siguiente=<ruta>`.
2. Para editar desde una página pública, el editor entra a `/admin/ingresar?siguiente=/ashaninka`
   (o a `/admin/ingresar` a secas, que lo deja en la portada). No hay enlace público al login.
3. El formulario envía correo y contraseña a una Server Action que llama a `signInWithPassword`
   con el cliente de `@supabase/ssr`, que deja la sesión en cookies.
4. Si entra y tiene rol `editor` → deja la cookie `ll_editor=1` (misma duración que la sesión) y
   redirige a `siguiente`. `siguiente` solo se acepta si es una ruta **interna** (empieza por `/` y
   no por `//` ni por `/\`); cualquier otra cosa → `/`, para no abrir una redirección hacia afuera.
5. Si entra pero no tiene rol → cierra la sesión y muestra «Tu cuenta no tiene acceso de editor».
6. «Cerrar sesión» (en la barra de edición y en el panel) → `signOut`, borra `ll_editor` y deja al
   editor en la misma página, ya como visitante.

`requireEditor()` usa `supabase.auth.getUser()` (valida el token contra Supabase), **nunca** solo
`getSession()` (lee la cookie sin validarla).

### 4.2 `GET /api/admin/sesion`

- Responde `{ "editor": true }` o `{ "editor": false }`, siempre `200` y `Cache-Control: no-store`.
- Es la única forma en que una página estática se entera de que hay un editor.
- Si responde `false` con la pista presente (sesión vencida), la isla borra `ll_editor`.

### 4.3 Configuración

**Supabase** (a mano, documentado en `docs/media-schema.sql`):

- _Authentication → Providers → Email_: habilitado. _Allow new users to sign up_: **desactivado**.
- Crear cada editor en _Authentication → Users → Add user_ con «Auto Confirm User».
- Darle el rol: `update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"editor"}' where email = '…';`
- Quitar el acceso: borrar el usuario o quitar la clave `role`.

**Variables nuevas** (Vercel: Production y Preview; `.env.local` en desarrollo):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co   # la misma que SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=...                   # pública por diseño; las tablas siguen cerradas
```

### 4.4 Criterios de aceptación

| ID      | Criterio                                                                                                                                        |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-B1-1 | Sin sesión, `GET /admin/biblioteca` responde con redirección a `/admin/ingresar?siguiente=/admin/biblioteca`.                                   |
| AC-B1-2 | Con un editor, `?siguiente=/ashaninka` lleva a `/ashaninka`; `?siguiente=https://otro.sitio`, `//otro.sitio` o `/\otro.sitio` llevan a `/`.     |
| AC-B1-3 | Con credenciales incorrectas se ve «Correo o contraseña incorrectos» y no se revela si el correo existe.                                        |
| AC-B1-4 | Una cuenta válida **sin** `app_metadata.role = "editor"` no queda con sesión ni con `ll_editor`.                                                |
| AC-B1-5 | Toda Server Action y todo Route Handler que edita, llamados **directamente** sin sesión o sin rol, responden `unauthorized` y no tocan la base. |
| AC-B1-6 | `requireEditor` usa `getUser()`; un test falla si se reemplaza por `getSession()`.                                                              |
| AC-B1-7 | Con `ll_editor=1` puesta a mano y sin sesión, `/api/admin/sesion` responde `{ "editor": false }` y la página no muestra ningún control.         |
| AC-B1-8 | `/admin/*` lleva `noindex` y no aparece en ningún enlace del sitio público.                                                                     |
| AC-B1-9 | En el panel de Supabase, el registro público está desactivado (verificación manual, anotada en el plan).                                        |

---

## 5. B2 — Biblioteca

### 5.1 Tipos y límites

| Tipo       | Formatos              | Tamaño máximo | Además                                                     |
| ---------- | --------------------- | ------------- | ---------------------------------------------------------- |
| Imagen     | JPEG, PNG, WebP, AVIF | 10 MB         | Ancho y alto reales                                        |
| Video      | MP4 (H.264/AAC), WebM | 200 MB        | Ancho, alto, duración; portada (imagen, 10 MB) obligatoria |
| Subtítulos | WebVTT (`.vtt`)       | 1 MB          | Obligatorios si el video tiene habla (decisión #14)        |

Los límites de 200 MB y de formatos dependen del plan Pro (decisión #2). El tipo se valida por
extensión **y** por tipo MIME declarado; el bucket también restringe tipos y tamaño en Supabase.

### 5.2 Modelo de datos

```sql
create table public.media_assets (
  id               uuid        primary key default gen_random_uuid(),
  kind             text        not null check (kind in ('image', 'video')),
  storage_path     text        not null unique,
  mime_type        text        not null,
  bytes            bigint      not null check (bytes > 0),
  width            integer     not null check (width > 0),
  height           integer     not null check (height > 0),
  duration_seconds numeric              check (duration_seconds > 0),
  poster_path      text,
  captions_path    text,
  has_speech       boolean,
  alt              text        not null check (char_length(btrim(alt)) > 0),
  caption          text,
  credit_author    text        not null check (char_length(btrim(credit_author)) > 0),
  credit_license   text        not null check (char_length(btrim(credit_license)) > 0),
  credit_url       text        not null check (credit_url ~ '^https?://'),
  created_by       uuid        references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- A video always has a poster and states whether it has speech; speech requires captions.
  check (kind = 'image' or (poster_path is not null and duration_seconds is not null and has_speech is not null)),
  check (kind = 'image' or has_speech = false or captions_path is not null),
  check (kind = 'video' or (poster_path is null and captions_path is null and has_speech is null))
);

alter table public.media_assets enable row level security;
revoke all on public.media_assets from anon, authenticated, service_role;
grant select, insert, update, delete on public.media_assets to service_role;
```

Rutas en Storage: `images/<id>.<ext>`, `videos/<id>.<ext>`, `posters/<id>.<ext>`,
`captions/<id>.vtt`. El nombre original del archivo **no** se usa en la ruta.

### 5.3 Flujo de subida

El mismo flujo sirve desde `/admin/biblioteca` y desde el diálogo de edición sobre la página.

1. El editor elige el archivo y llena descripción, pie de foto opcional y crédito **antes** de subir.
2. El navegador valida tipo y tamaño y lee las dimensiones (y la duración, si es video).
3. Server Action `createUpload` → `requireEditor` → valida metadatos y límites con el esquema
   compartido → genera el `id` y las rutas → devuelve URLs firmadas de subida (una por archivo).
4. El navegador sube cada archivo directo a Storage, con barra de progreso.
5. Server Action `registerAsset` → `requireEditor` → comprueba que los objetos existen en Storage y
   que su tamaño coincide → inserta la fila.

Si el paso 4 o 5 falla, la UI ofrece reintentar. Un objeto subido sin fila (el editor cerró la
pestaña) es un huérfano aceptado: `docs/media-schema.sql` incluye la consulta para encontrarlos.

### 5.4 Pantalla `/admin/biblioteca`

- Grilla con miniatura, tipo, descripción, crédito y en qué espacios se usa cada elemento, con
  enlace a la página donde aparece.
- Filtro por tipo (imagen / video) y búsqueda por descripción o autor.
- Subir, editar metadatos (no el archivo: para cambiar el archivo se sube uno nuevo) y borrar con
  confirmación; borrar está deshabilitado si el elemento está en uso, con el nombre del espacio.

### 5.5 Criterios de aceptación

| ID       | Criterio                                                                                                                                                   |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-B2-1  | Un editor sube una imagen JPEG de 3 MB con descripción y crédito, y aparece en la biblioteca con sus dimensiones reales.                                   |
| AC-B2-2  | Un editor sube un video MP4 de 150 MB con portada y subtítulos; el archivo **no** pasa por una función de Vercel (se ve en la red del navegador).          |
| AC-B2-3  | Un archivo de tipo no permitido o por encima del límite se rechaza en el navegador **y** en `createUpload` (`invalid_file`), con mensaje en español.       |
| AC-B2-4  | Sin descripción, autor, licencia o URL no se puede guardar; una descripción genérica («foto», «imagen») se rechaza con la misma regla que `peoples:check`. |
| AC-B2-5  | Un video marcado «con habla» sin subtítulos se rechaza (`captions_required`); marcado «sin habla» se acepta.                                               |
| AC-B2-6  | `registerAsset` con una ruta que no existe en Storage o con otro tamaño responde `upload_missing` y no inserta.                                            |
| AC-B2-7  | Editar el crédito de un elemento se refleja en todas las páginas donde está elegido (vía AC-B3-5).                                                         |
| AC-B2-8  | Borrar un elemento en uso responde `asset_in_use` y nombra el espacio; uno sin uso desaparece de la tabla y de Storage.                                    |
| AC-B2-9  | `peoples:check` sigue pasando y usa las reglas de `src/lib/media/credit-rules.ts` (no una copia).                                                          |
| AC-B2-10 | Un usuario `anon` o `authenticated` no puede leer ni escribir `media_assets` ni subir al bucket sin URL firmada (prueba con la clave pública).             |

---

## 6. B3 + B4 — Espacios, edición sobre la página y lectura pública

### 6.1 Espacios de v1

| Id (`SlotId`)       | Página       | Acepta         | Cantidad | Respaldo (decisión #10)                       |
| ------------------- | ------------ | -------------- | -------- | --------------------------------------------- |
| `home.hero`         | `/`          | imagen         | 1        | `/ash.jpg` con su `alt` actual                |
| `ashaninka.gallery` | `/ashaninka` | imagen y video | 0 a 12   | `photos` de `src/data/peoples/ashaninka.json` |

```sql
create table public.media_slot_items (
  slot_id   text    not null,
  position  integer not null check (position >= 0),
  asset_id  uuid    not null references public.media_assets (id) on delete restrict,
  primary key (slot_id, position)
);
-- Same lock-down as media_assets.
```

Que `slot_id` sea un espacio válido, y que tipo y cantidad respeten `slots.ts`, lo valida el
servidor al guardar. La base no lo sabe: el registro vive en código (decisión #9).

### 6.2 Cómo se ve para el editor

Con la sesión de editor iniciada, en cualquier página del sitio:

- **Barra de edición** fija abajo: «Modo edición · Ocultar controles · Biblioteca · Cerrar sesión».
  «Ocultar controles» quita los botones para ver la página como un visitante, sin cerrar sesión.
- Sobre cada espacio, un **contorno** y un botón visible al pasar el mouse **y** al llegar con el
  teclado: **«Editar imagen»** en `home.hero`, **«Editar galería»** en `ashaninka.gallery`.
- Un espacio que muestra el respaldo lleva la etiqueta «Contenido por defecto».

El botón abre un **diálogo** con tres pestañas:

| Pestaña                     | Qué hace                                                                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Elegir de la biblioteca** | La biblioteca **filtrada por lo que acepta el espacio**, con búsqueda. Selección única (`home.hero`) o múltiple (galería).        |
| **Subir nuevo**             | El flujo de §5.3. Lo subido queda en la biblioteca y ya elegido en el espacio.                                                    |
| **Datos**                   | Corrige descripción, pie y crédito del elemento elegido (en la galería, del que se marque). Cambia ese elemento en todo el sitio. |

En la galería, el diálogo muestra además la lista elegida con **reordenar** (arrastrar, y botones
«Subir» / «Bajar» para teclado) y **quitar**. «Guardar» reemplaza la lista entera del espacio en
una transacción; «Cancelar» no cambia nada. Tras guardar, el diálogo se cierra y la página muestra
el cambio.

### 6.3 Cómo funciona la isla

1. `src/app/layout.tsx` monta `<InlineMediaEditor />`, un componente cliente que solo lee
   `document.cookie` buscando `ll_editor`. Si no está: no hace nada más (sin peticiones, sin
   renderizar, sin cargar código).
2. Si está: pide `GET /api/admin/sesion`. Si responde `editor: true`, carga `editor-ui.tsx` con
   **import dinámico** y este busca los elementos `[data-media-slot]` de la página para poner sus
   botones encima (con portales, sin tocar el HTML del servidor).
3. Los espacios (`MediaSlot`) siguen siendo **componentes de servidor**: renderizan la figura y un
   atributo `data-media-slot="<id>"`. No saben nada de la sesión.
4. El diálogo trae los datos que necesita con Server Actions protegidas (`listAssets`, `saveSlot`,
   `updateAssetMetadata`), no los incrusta la página.

### 6.4 Lectura en las páginas públicas

- `read-slots.ts` lee con la `service_role` en el servidor, envuelto en `unstable_cache` con
  etiqueta `media-slot:<id>` y `revalidate: 3600`. El proyecto **no** tiene Cache Components
  activado, y activarlo queda fuera de esta spec.
- `saveSlot` y `updateAssetMetadata` invalidan las etiquetas afectadas con **`updateTag`** (Server
  Action), y el diálogo refresca la ruta para que el editor vea el cambio sin recargar a mano.
  **Riesgo a verificar en la primera tarea de B4:** la documentación de `updateTag` solo muestra
  etiquetas puestas con `fetch` o `cacheTag`. Si no invalida las de `unstable_cache`, se usa
  `revalidateTag(tag, "max")` más `revalidatePath` de la página, el diálogo recarga la página
  completa, y AC-B3-4 se ajusta a «tras recargar».
- Cualquier error de lectura (sin variables, Supabase caído o pausado, `slot_id` con un elemento
  borrado) → respaldo del repo y un `console.error` con el código, sin datos.
- Imágenes: `next/image` con `width` y `height` de la fila. `next.config.ts` gana **un** patrón en
  `images.remotePatterns`, acotado al bucket: `https://<proyecto>.supabase.co/storage/v1/object/public/media/**`.
- Video: `<video controls preload="none" playsInline poster=… width height>` con
  `<track kind="captions" srclang="es" label="Español" default>` cuando hay subtítulos.
- El crédito se ve debajo de cada elemento, imagen o video, como hoy en la galería. En `home.hero`
  va como una línea pequeña sobre la foto, en la esquina inferior.

### 6.5 Criterios de aceptación

| ID      | Criterio                                                                                                                                                        |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-B3-1 | Con sesión de editor, `/` muestra «Editar imagen» sobre la portada y `/ashaninka` muestra «Editar galería»; ambos se alcanzan con Tab y se abren con Enter.     |
| AC-B3-2 | El diálogo de `home.hero` solo lista imágenes y permite elegir una; el de `ashaninka.gallery` lista imágenes y videos y permite varios, reordenar y quitar.     |
| AC-B3-3 | Subir desde la pestaña «Subir nuevo» deja el elemento en la biblioteca **y** elegido en el espacio, sin pasar por `/admin`.                                     |
| AC-B3-4 | Tras «Guardar», el diálogo se cierra y la página muestra el cambio sin que el editor recargue a mano (ver riesgo en §6.4).                                      |
| AC-B3-5 | Corregir el crédito en la pestaña «Datos» cambia el crédito en todas las páginas donde está ese elemento.                                                       |
| AC-B3-6 | `saveSlot` con un tipo no permitido, más elementos que el máximo o un `slot_id` desconocido responde `invalid_slot` y no cambia nada.                           |
| AC-B3-7 | Guardar es atómico: si falla a la mitad, el espacio queda como estaba y el diálogo muestra «No pudimos guardar. Intenta de nuevo.».                             |
| AC-B3-8 | «Ocultar controles» quita contornos y botones; «Cerrar sesión» deja al editor en la misma página sin controles y sin `ll_editor`.                               |
| AC-B3-9 | El diálogo atrapa el foco, cierra con Escape y devuelve el foco al botón que lo abrió.                                                                          |
| AC-B4-1 | `next build` sigue reportando `/` y `/ashaninka` como `○`.                                                                                                      |
| AC-B4-2 | Con las variables de Supabase ausentes, `pnpm build && pnpm start` sirve las dos páginas con el contenido de hoy (e2e de CI).                                   |
| AC-B4-3 | Un visitante sin `ll_editor` no hace ninguna petición a `/api/admin/sesion` ni descarga el chunk de `editor-ui` (e2e: red del navegador).                       |
| AC-B4-4 | Un video en la galería se ve con portada, controles nativos, subtítulos activables y su crédito.                                                                |
| AC-B4-5 | Un video no descarga nada más que la portada hasta que el visitante pulsa reproducir (`preload="none"`).                                                        |
| AC-B4-6 | `next.config.ts` tiene **un solo** patrón remoto, limitado al bucket `media` del proyecto.                                                                      |
| AC-B4-7 | Los componentes de `/ashaninka` y de `/` siguen sin `"use client"`; la única directiva nueva es la de `InlineMediaEditor` y sus hijos (AC-M2-15 se ajusta, §9). |
| AC-B4-8 | `scripts/seed-media.ts` sube las 5 fotos de `/ashaninka` con sus créditos y las deja elegidas en `ashaninka.gallery`, en el mismo orden. Es idempotente.        |

---

## 7. Seguridad

- La `service_role` key sigue solo en el servidor; la clave pública no da acceso a ninguna tabla
  (AC-B2-10).
- Doble barrera de acceso: `proxy.ts` (optimista) y `requireEditor` en cada punto de entrada que
  lee datos del panel o escribe (AC-B1-5).
- La cookie `ll_editor` es **solo una pista** para no molestar a los visitantes: no lleva datos, no
  autoriza nada y falsificarla solo hace que la isla pregunte y reciba `false` (AC-B1-7). El código
  del editor que se descarga es público como todo el JavaScript del sitio; no contiene secretos.
- Las URLs firmadas de subida son de un solo uso y para una ruta que eligió el servidor; el
  navegador no elige nombres ni carpetas.
- `siguiente` solo acepta rutas internas (AC-B1-2).
- Los subtítulos se sirven como archivo, nunca se insertan como HTML.
- Los límites de intentos de login son los de Supabase Auth (por IP). No se agrega otro.
- Los logs registran códigos y `id`, nunca correos ni metadatos libres.

---

## 8. Pruebas

- **Unitarias** (Supabase simulado, como solicitudes): `requireEditor`, `/api/admin/sesion`,
  validación de `siguiente`, esquema de metadatos y límites, `createUpload`, `registerAsset`,
  `saveSlot`, `updateAssetMetadata`, borrado con uso, `read-slots` con error → respaldo.
- **Componentes**: `MediaFigure` con imagen y con video con y sin subtítulos; `InlineMediaEditor`
  sin pista (no pide nada), con pista y `editor: false` (borra la pista), con `editor: true`
  (carga la UI); diálogo con teclado.
- **E2E en CI** (sin Supabase real): redirección de `/admin/*` sin sesión (AC-B1-1), páginas con
  respaldo (AC-B4-2), visitante sin peticiones ni chunk del editor (AC-B4-3), y la isla con
  `/api/admin/sesion` interceptada para mostrar los botones (AC-B3-1).
- **Manual en Preview** (documentado como `docs/solicitudes-pruebas.md`): login, volver a la
  portada, cambiar la imagen, subir un video a la galería, corregir un crédito, cerrar sesión.
  Preview comparte el proyecto de producción (decisión #11 de solicitudes): usar elementos con
  «PRUEBA» en la descripción y devolver los espacios a su estado anterior al terminar.

---

## 9. Cambios a otras specs

| Spec                               | Cambio                                                                                                                                                         |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ashaninka.md](./ashaninka.md)     | §7.1 y **AC-M3-4** («sin `remotePatterns`»): se reemplazan por AC-B4-6. La galería pasa a aceptar video. **AC-M2-15** se ajusta según AC-B4-7. El resto sigue. |
| [solicitudes.md](./solicitudes.md) | Ninguno en el código. La política de privacidad (`docs/politica-privacidad.md`) se actualiza por la decisión #13.                                              |

Ambas se marcan con una nota que apunte a esta spec; no se reescriben.

---

## 10. Preguntas abiertas

| #   | Pregunta                                                                               | Si no hay respuesta                                                                                                                 |
| --- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| P1  | ¿Se contrata Supabase Pro ($25/mes)?                                                   | No se despliega. En gratis el video queda en 50 MB y el proyecto se pausa.                                                          |
| P2  | ¿Cuántos editores y quién es el administrador que crea cuentas?                        | Se asume 1 administrador técnico y hasta 5 editores.                                                                                |
| P3  | ¿Subtítulos obligatorios para video con habla, aunque frene la publicación?            | Se mantiene obligatorio (decisión #14).                                                                                             |
| P4  | ¿Quién es el autor de `/ash.jpg` (portada) y con qué licencia?                         | Se queda como respaldo sin crédito visible y **no** se importa a la biblioteca.                                                     |
| P5  | ¿Hace falta recuperar contraseña por correo?                                           | No en v1. Requiere SMTP propio (Resend, Brevo…) y se especifica aparte.                                                             |
| P6  | ¿Videos largos (más de unos minutos) en conexiones lentas?                             | v1 sirve el archivo tal cual. Si hacen falta, se evalúa streaming (Cloudflare Stream, Mux) o mover video a R2 por costo de tráfico. |
| P7  | ¿Qué otros lugares del sitio deberían ser espacios (lenguas, juegos, pueblos futuros)? | Solo los dos de §6.1. Cada uno nuevo se agrega con su criterio.                                                                     |
| P8  | ¿Hace falta revisar un cambio antes de publicarlo (borrador / aprobación)?             | No en v1: guardar publica. Con varios editores puede hacer falta; se especifica aparte.                                             |
