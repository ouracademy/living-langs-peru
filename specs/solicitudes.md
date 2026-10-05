# Solicitudes de apoyo (donador / editor)

> Estado: **borrador** · Fecha: 2026-10-05 (decisiones del pedido incorporadas; pendiente de visto bueno final) ·
> Rama sugerida: `feat/solicitudes`
> Rama base: `main` · Plan: `tasks/solicitudes/` (se escribe tras la aprobación) · Índice:
> [specs/README.md](./README.md)
> Depende de: nada del resto del sitio. Toca [src/components/support.tsx](../src/components/support.tsx).

---

## 1. Objetivo

En la sección **¿Quieres apoyarnos?** de la portada hay dos cards: **Registrarse como editor**
(botón «Crear cuenta») y **Donar** (botón «Donar»). Hoy los botones son enlaces a `/registro-editor`
y `/donar`, dos rutas que no existen. Este trabajo los reemplaza por un **modal con un formulario
corto**. El envío guarda una **solicitud de contacto** en Supabase para que el equipo escriba a la
persona.

No es una cuenta ni un pago: no hay login, no hay pasarela, no hay panel. Es un buzón.

**Usuarios**

| Usuario                      | Necesidad                                                                  |
| ---------------------------- | -------------------------------------------------------------------------- |
| Persona que quiere colaborar | Dejar sus datos en menos de un minuto, sin crear cuenta, desde el celular. |
| Equipo del proyecto          | Recibir solicitudes limpias, sin spam, y leerlas en el panel de Supabase.  |

**Qué NO es este trabajo**

- No hay cuentas, sesiones ni autenticación de usuarios.
- No se procesan donaciones: «Donar» solo registra el interés y el equipo contacta.
- No hay panel de administración: las filas se leen en el _Table Editor_ de Supabase.
- No se envían correos ni notificaciones al equipo cuando llega una solicitud.
- No se evitan duplicados (decisión del pedido): la misma persona puede enviar dos veces.
- No hay borrado automático ni formulario de «borrar mis datos»: el equipo borra las filas a mano cuando se lo piden (decisión #13).
- No hay funciones de Postgres, triggers ni políticas RLS.
- No se modifica el bloque comentado de **Voluntarios** en `support.tsx` (decisión #14).
- La card de **Voluntarios** ya no existe; `rol` solo admite `donador` y `editor`.

---

## 2. Decisiones tomadas

| #   | Decisión                     | Elección                                                                                                                                                                                                                                                            |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Acceso a datos**           | Solo el servidor, con la `service_role` key. El navegador nunca habla con Supabase. RLS activada **sin políticas** (deniega todo a `anon` y `authenticated`; `service_role` la ignora).                                                                             |
| 2   | **Un modal por card**        | Cada card monta su propio `Dialog` con el rol ya elegido (`editor` o `donador`). El selector de rol **sigue visible** y se puede cambiar. `Support` sigue siendo componente de servidor; solo el modal es cliente.                                                  |
| 3   | **Validación**               | Un solo esquema Zod en `src/lib/requests/schema.ts`, importado por el formulario y por el endpoint. Misma regla en ambos lados; el servidor es la que manda.                                                                                                        |
| 4   | **Anti-spam**                | Tres capas: honeypot `website`, límite por IP y validación estricta. No hay CAPTCHA.                                                                                                                                                                                |
| 5   | **Respuesta indistinguible** | El éxito real y el del honeypot devuelven **exactamente la misma respuesta** (`200` + mismo cuerpo). Si el éxito real fuera `201`, el bot aprendería cuál es la trampa.                                                                                             |
| 6   | **Límite por IP**            | **Upstash Redis + `@upstash/ratelimit`**, ventana deslizante de 5 envíos por hora. Ver §6.                                                                                                                                                                          |
| 7   | **Orden en el endpoint**     | JSON válido → honeypot → validación → límite por IP → insert. El honeypot va antes del límite para que los bots no gasten comandos de Redis; la validación va antes para que un error de tipeo no consuma uno de los 5 envíos.                                      |
| 8   | **Si Upstash falla**         | **Fail-open**: se registra el error y se deja pasar. Perder una donante legítima cuesta más que un pico de spam, y quedan honeypot, validación y los `check` de la base. Si faltan las variables de Upstash **en producción**, es un error de configuración: `500`. |
| 9   | **Lengua del código**        | Las claves del JSON y las columnas de la tabla van **en español** (`nombre`, `telefono`...), confirmado. El código usa inglés: se renombran al entrar al handler (ver §3.2).                                                                                        |
| 10  | **Rutas de archivo**         | El repo usa `src/` y kebab-case, así que `app/api/solicitudes/route.ts` → `src/app/api/solicitudes/route.ts` y `lib/supabaseAdmin.ts` → `src/lib/supabase-admin.ts` (`check:language` exige kebab-case).                                                            |
| 11  | **Preview y producción**     | Los deploys de Preview usan **el mismo proyecto de Supabase** que producción (confirmado). Consecuencia: toda prueba hecha en Preview escribe filas reales; ver §4.2.                                                                                               |
| 12  | **Política de privacidad**   | Se escribe, en `docs/politica-privacidad.md`, y se publica como página `/privacidad` (capacidad S4). El checkbox de consentimiento enlaza a ella.                                                                                                                   |
| 13  | **Borrado de datos**         | Manual. Quien administra el proyecto borra la fila desde el _Table Editor_ de Supabase cuando recibe el pedido. No se construye ningún endpoint de borrado.                                                                                                         |
| 14  | **Bloque de Voluntarios**    | No se toca. El bloque comentado de `support.tsx` lo elimina el usuario a mano si corresponde. El cambio en ese archivo debe dejarlo tal cual.                                                                                                                       |

---

## 3. Mapa de capacidades

Una feature, cuatro capacidades que se verifican por separado. Las flechas apuntan a la dependencia.

| Id  | Capacidad                                  | Depende de | Se verifica con                                   |
| --- | ------------------------------------------ | ---------- | ------------------------------------------------- |
| S1  | Base de datos + variables de entorno       | —          | SQL en Supabase, `curl` con la `service_role`     |
| S2  | Endpoint `POST /api/solicitudes` + esquema | S1         | Tests unitarios con Supabase y Upstash simulados  |
| S3  | Modal + formulario cliente                 | S2, S4     | Tests de componente + e2e con la API interceptada |
| S4  | Página `/privacidad` con la política       | —          | e2e de la página + revisión del texto             |

Orden de construcción: **S1 → S2**, **S4** (independiente, puede ir en paralelo) → **S3**. Cada fase
termina con algo que funciona de punta a punta (S1: se puede insertar una fila a mano; S2: `curl` guarda y
rechaza; S4: la página se abre; S3: se usa desde la portada y enlaza a la política).

### 3.1 Estructura de archivos

```
src/app/api/solicitudes/route.ts          POST (S2)
src/lib/supabase-admin.ts                 cliente de servidor, `server-only` (S1/S2)
src/lib/requests/schema.ts                esquema Zod + tipos + mensajes; lo importan cliente y servidor (S2)
src/lib/requests/rate-limit.ts            límite por IP + lectura de la IP (S2)
src/components/support-request-dialog.tsx modal (cliente) con el botón disparador (S3)
src/components/support-request-form.tsx   formulario (cliente) (S3)
src/components/ui/{dialog,textarea,label,checkbox,select}.tsx   shadcn, estilo base-nova (S3)
src/components/support.tsx                usa el modal en vez de <Link> (S3)
src/app/privacidad/page.tsx               página de la política, componente de servidor (S4)
docs/politica-privacidad.md               texto fuente de la política (S4)
tests/e2e/privacy.spec.ts                 e2e de la página (S4)
tests/unit/requests/*.test.ts(x)          unitarios (S2, S3)
tests/e2e/support-request.spec.ts         e2e con `page.route` (S3)
```

### 3.2 Frontera de idioma

La tabla y el JSON usan español (decisión #9); el código usa inglés. Se renombra al entrar al handler:

```ts
// src/app/api/solicitudes/route.ts
const parsed = requestSchema.safeParse(body);
if (!parsed.success) return validationError(parsed.error);
const {
  nombre: name,
  telefono: phone,
  email,
  rol: role,
  motivo: reason,
} = parsed.data;

await supabaseAdmin.from("solicitudes").insert({
  nombre: name,
  telefono: phone,
  email: email ?? null,
  rol: role,
  motivo: reason,
  consentimiento: true,
});
```

Códigos de error de la API en inglés (`validation_error`); mensajes al usuario en español.

---

## 4. S1 — Base de datos y entorno

### 4.1 SQL (se pega en el _SQL Editor_ de Supabase; el código no lo ejecuta)

```sql
create table public.solicitudes (
  id             uuid        primary key default gen_random_uuid(),
  nombre         text        not null,
  telefono       text        not null,
  email          text,
  rol            text        not null check (rol in ('donador', 'editor')),
  motivo         text        not null check (char_length(motivo) between 10 and 1000),
  consentimiento boolean     not null check (consentimiento = true),
  created_at     timestamptz not null default now()
);

-- RLS sin políticas: anon y authenticated no pueden leer ni escribir nada.
-- El servidor usa la service_role key, que ignora RLS.
alter table public.solicitudes enable row level security;

-- Segunda barrera: aunque alguien cree por error una política permisiva más
-- adelante, estos roles siguen sin permisos sobre la tabla.
revoke all on public.solicitudes from anon, authenticated;
```

Diferencia con el pedido: `created_at` lleva `not null` además de `default now()` (nunca debería
quedar vacío), y se agrega el `revoke` (decisión confirmada). Sin funciones, sin triggers, sin índice único.

### 4.2 Variables de entorno

| Variable                    | Dónde se usa                  | Notas                                                        |
| --------------------------- | ----------------------------- | ------------------------------------------------------------ |
| `SUPABASE_URL`              | `src/lib/supabase-admin`      | Supabase → _Project Settings → API → Project URL_.           |
| `SUPABASE_SERVICE_ROLE_KEY` | `src/lib/supabase-admin`      | _Project Settings → API Keys_ → `service_role`. **Secreta.** |
| `UPSTASH_REDIS_REST_URL`    | `src/lib/requests/rate-limit` | De la base Upstash (§6).                                     |
| `UPSTASH_REDIS_REST_TOKEN`  | `src/lib/requests/rate-limit` | **Secreto.**                                                 |

**Ninguna lleva el prefijo `NEXT_PUBLIC_`.** Next.js solo incrusta en el bundle del navegador las que
lo llevan; las demás existen solo en Node
(`node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`). Además, `supabase-admin.ts`
importa `server-only`, así que si un componente cliente lo importa por error, **el build falla**.

**`.env.local` (local)** — el repo ya ignora `.env*` en `.gitignore`:

1. Crea `.env.local` en la raíz del repo.
2. Pega las cuatro variables, sin comillas ni espacios alrededor del `=`.
3. Reinicia `pnpm dev` (Next solo lee el archivo al arrancar).

```bash
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=...
```

**Vercel**:

1. _Project → Settings → Environment Variables_.
2. Agrega las cuatro, en los entornos **Production** y **Preview** (y **Development** si usas
   `vercel env pull`). Marca las dos secretas como **Sensitive**.
3. **Vuelve a desplegar**: las variables nuevas no llegan a un deploy que ya existe.
4. Alternativa para Upstash: _Storage → Marketplace → Upstash Redis_ crea la base y le inyecta las
   variables al proyecto. Esa integración puede nombrarlas `KV_REST_API_URL` / `KV_REST_API_TOKEN`; si es así,
   se copian a los nombres `UPSTASH_REDIS_REST_*` o se cambia el código a los suyos (se confirma al
   configurar).

**Preview comparte el proyecto de Supabase de producción** (decisión #11), así que las variables son las
mismas en ambos entornos y cualquier envío hecho desde un deploy de Preview queda en la tabla real. Al
probar, usa un nombre reconocible (por ejemplo «PRUEBA») y bórralo después a mano. Los tests
automáticos nunca escriben: simulan la API (§10).

### 4.3 Criterios de aceptación

| ID      | Criterio                                                                                                                                                                 |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-S1-1 | El SQL de §4.1 corre sin errores en un proyecto Supabase vacío.                                                                                                          |
| AC-S1-2 | Insertar con la `service_role` una fila válida funciona.                                                                                                                 |
| AC-S1-3 | Insertar con la `anon` key (REST de Supabase) devuelve error de permisos y **no** crea fila.                                                                             |
| AC-S1-4 | Leer con la `anon` key devuelve cero filas aunque haya datos.                                                                                                            |
| AC-S1-5 | La base rechaza `rol = 'voluntario'`, un `motivo` de 9 o 1001 caracteres y `consentimiento = false`.                                                                     |
| AC-S1-6 | `grep -rn "NEXT_PUBLIC_" src/` no encuentra ninguna de las cuatro variables, y ningún componente importa `supabase-admin`.                                               |
| AC-S1-7 | Con la política `anon` simulada (crear a propósito una política permisiva de prueba) la `anon` key **sigue** sin acceso gracias al `revoke`; luego se borra la política. |

---

## 5. S2 — Endpoint y esquema

### 5.1 Contrato

`POST /api/solicitudes` · `Content-Type: application/json`

```jsonc
{
  "nombre": "Rosa Quispe",
  "telefono": "+51 987 654 321",
  "email": "rosa@example.com", // opcional; "" o ausente = sin email
  "rol": "editor", // "donador" | "editor"
  "motivo": "Hablo asháninka y quiero ayudar a validar traducciones.",
  "consentimiento": true,
  "website": "", // honeypot; debe llegar vacío
}
```

| Caso                       | Estado | Cuerpo                                                                                                                                          |
| -------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Guardada                   | 200    | `{ "ok": true, "message": "¡Gracias! Recibimos tu solicitud y te contactaremos pronto." }`                                                      |
| Honeypot con contenido     | 200    | **El mismo cuerpo**, sin tocar la base ni Redis (decisión #5).                                                                                  |
| Cuerpo no es JSON          | 400    | `{ "error": "invalid_json", "message": "No pudimos leer tu solicitud. Intenta de nuevo." }`                                                     |
| Validación                 | 400    | `{ "error": "validation_error", "message": "Revisa los campos marcados.", "fields": { "telefono": "Ingresa un teléfono de 7 a 15 dígitos." } }` |
| Demasiados envíos          | 429    | `{ "error": "rate_limited", "message": "Enviaste varias solicitudes. Intenta de nuevo en una hora." }` + cabecera `Retry-After`                 |
| Fallo de Supabase / config | 500    | `{ "error": "server_error", "message": "No pudimos guardar tu solicitud. Intenta de nuevo más tarde." }`                                        |

Nunca se devuelve la fila guardada, el `id`, ni el mensaje crudo de Supabase o Upstash. Los errores
reales se registran con `console.error` en el servidor (sin el cuerpo de la solicitud: tiene datos
personales).

### 5.2 Reglas de validación (`requestSchema`)

| Campo            | Regla                                                                                                                   | Mensaje (es)                                    |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `nombre`         | `trim`, 1 a 100 caracteres                                                                                              | «Ingresa tu nombre.»                            |
| `telefono`       | Solo dígitos y espacios, con un `+` opcional **al inicio**; entre 7 y 15 **dígitos** (los espacios y el `+` no cuentan) | «Ingresa un teléfono de 7 a 15 dígitos.»        |
| `email`          | Opcional. `""` se trata como ausente (→ `NULL`). Si viene, email válido y máximo 254 caracteres                         | «Ingresa un correo válido.»                     |
| `rol`            | `"donador"` o `"editor"`                                                                                                | «Elige una opción.»                             |
| `motivo`         | `trim`, 10 a 1000 **caracteres Unicode** (ver abajo)                                                                    | «Cuéntanos un poco más (mínimo 10 caracteres).» |
| `consentimiento` | Exactamente `true`                                                                                                      | «Debes aceptar para poder enviar.»              |
| `website`        | Se lee antes de validar; no es parte del esquema guardado                                                               | —                                               |

Detalles que importan:

- **Conteo del motivo.** Postgres `char_length` cuenta caracteres Unicode; `String.length` cuenta
  unidades UTF-16. Un motivo de 5 emojis mide 10 en JS y 5 en Postgres: pasaría Zod y la base lo
  rechazaría con un 500. El esquema cuenta con `[...value].length`, igual que `char_length`.
- **Se guarda el valor recortado** (`trim`), que es el que mide el `check` de la base.
- **Teléfono**: se guarda recortado y con los espacios repetidos colapsados; la forma en que la persona lo
  escribió es lo que el equipo va a leer.
- Los máximos de `nombre` (100) y `email` (254) no vienen del pedido ni de la base; se agregan para que nadie
  suba 5 MB en un campo.
- **Versión de Zod**: la API cambió entre v3 y v4 (`z.email()` vs `z.string().email()`, `flatten`). Se
  consulta la documentación de la versión instalada al implementar.

### 5.3 Cliente de Supabase (`src/lib/supabase-admin.ts`)

```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
```

Es un servidor sin sesión, así que no se persiste ni se refresca nada. Si faltan las variables,
el `throw` ocurre al importar el módulo; el handler lo captura y responde `500` genérico.

### 5.4 Criterios de aceptación

| ID       | Criterio                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------ |
| AC-S2-1  | Un cuerpo válido responde 200 con el cuerpo de éxito e inserta **una** fila con los valores recortados.                  |
| AC-S2-2  | Sin `email` o con `email: ""`, la fila se guarda con `email = NULL`.                                                     |
| AC-S2-3  | `website` con contenido → 200 con el **mismo** cuerpo que AC-S2-1; no se llama a Supabase ni a Upstash.                  |
| AC-S2-4  | Cada regla de §5.2 se rechaza con 400, `error: "validation_error"` y el mensaje en español bajo la clave del campo.      |
| AC-S2-5  | Un cuerpo que no es JSON responde 400 `invalid_json`.                                                                    |
| AC-S2-6  | `telefono` acepta `+51 987 654 321` y `987654321`; rechaza 6 y 16 dígitos, letras, y `+` en medio.                       |
| AC-S2-7  | `motivo` de 10 y 1000 caracteres pasa; de 9 y 1001 no; `"😀😀😀😀😀"` (5 caracteres) no pasa.                            |
| AC-S2-8  | La 6.ª solicitud válida de la misma IP en una hora responde 429 con `Retry-After`; otra IP no se ve afectada.            |
| AC-S2-9  | Si el insert falla, responde 500 con el mensaje genérico; el cuerpo no contiene el texto del error simulado de Supabase. |
| AC-S2-10 | Si Upstash lanza un error, la solicitud se procesa (fail-open) y el error se registra.                                   |
| AC-S2-11 | Ninguna respuesta incluye `id`, `created_at` ni los datos enviados.                                                      |
| AC-S2-12 | Una solicitud inválida no consume cupo del límite por IP (decisión #7).                                                  |

---

## 6. Límite por IP — opción elegida

**Upstash Redis + `@upstash/ratelimit`** (algoritmo `slidingWindow(5, "1 h")`).

- **Por qué esta**: en Vercel cada petición puede caer en una instancia distinta y las instancias se
  apagan. Un contador en memoria no sirve, hace falta un almacén compartido. Upstash habla HTTP/REST (sin
  conexiones TCP persistentes, que es lo que le conviene a serverless), tiene plan gratuito y una librería de
  límite ya hecha, y se puede crear desde el Marketplace de Vercel.
- **Por qué no Vercel KV**: Vercel dejó de ofrecer KV propio y lo reemplazó por integraciones de
  Marketplace; la de Redis es Upstash. Es lo mismo con un paso menos de indirección.
- **Por qué no una tabla en Supabase**: obliga a una consulta y a una limpieza por cada envío, y el pedido
  dice «sin funciones de Postgres».
- **Costo**: el plan gratuito de Upstash cubre este volumen de sobra (unos pocos comandos por envío). Se
  confirman los límites vigentes al crear la base.
- **La IP**: se toma de `x-forwarded-for` (primer valor) y, si falta, de `x-real-ip`. Vercel establece esas
  cabeceras en su borde, así que el cliente no puede falsearlas. Sin IP legible (local), la clave es
  `"unknown"`. Detrás de una red compartida (colegio, cabina) varias personas comparten IP: 5 por hora es
  un límite generoso para ese caso, pero existe.
- **Prefijo de clave**: `ratelimit:solicitudes`, para que otros usos futuros de la misma base no choquen.

---

## 7. S3 — Modal y formulario

### 7.1 Estructura

- `Support` (servidor) mapea `options` y, en el footer de cada card, renderiza
  `<SupportRequestDialog role={item.role} triggerLabel={item.buttonText} />`. Se eliminan `href` y el
  `<Link>` (que además era HTML inválido: un `<a>` dentro de un `<button>`).
- `SupportRequestDialog` (`"use client"`) usa `Dialog` de shadcn (base-nova, sobre `@base-ui/react/dialog`,
  igual que `Sheet`). El disparador conserva el aspecto actual: `Button` con `rounded-full px-5 py-2.5`.
- `SupportRequestForm` vive dentro del `DialogContent`. `DialogTitle` y `DialogDescription` en español
  (accesibilidad: el modal debe tener nombre).
- Componentes de `ui/` nuevos, con el CLI de shadcn: `dialog`, `textarea`, `label`, `checkbox`, `select`.
  Se verifica que el CLI los genere sobre `@base-ui/react` y no Radix, como los existentes.

### 7.2 Campos

| Campo          | Control                                                       | Notas                                                                                                                                                                                                                                           |
| -------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nombre         | `Input` texto, `autoComplete="name"`                          | Obligatorio.                                                                                                                                                                                                                                    |
| Teléfono       | `Input` `type="tel"`, `autoComplete="tel"`, `inputMode="tel"` | Obligatorio. Abre el teclado numérico en el celular.                                                                                                                                                                                            |
| Email          | `Input` `type="email"`, `autoComplete="email"`                | Opcional; la etiqueta dice «(opcional)».                                                                                                                                                                                                        |
| Rol            | `Select`: «Donador» / «Editor»                                | Obligatorio. Valor inicial = rol de la card.                                                                                                                                                                                                    |
| Motivo         | `Textarea`                                                    | Obligatorio. Contador `n / 1000` visible; el contador cuenta caracteres Unicode, como el servidor.                                                                                                                                              |
| Consentimiento | `Checkbox` + etiqueta                                         | «Acepto que me contacten sobre mi solicitud y que mis datos se guarden para ese fin.» Debajo, «Más información en nuestra [Política de privacidad]», enlace a `/privacidad` con `target="_blank"` y `rel="noopener"` para no perder lo escrito. |
| `website`      | `<input type="text">` honeypot                                | Ver abajo.                                                                                                                                                                                                                                      |

**Honeypot.** `type="text"`, `name="website"`, `tabIndex={-1}`, `autoComplete="off"`, `aria-hidden="true"`,
posicionado con Tailwind (`absolute -left-[9999px]` y tamaño mínimo), **sin `display:none`** ni `hidden`
(los bots lo detectan). Va dentro de un contenedor `relative` para que el `absolute` no se salga del
modal. Su valor se envía en el cuerpo del POST como `website`.

### 7.3 Comportamiento

1. Al enviar (`onSubmit`, `noValidate` para controlar los mensajes), se valida con `requestSchema`. Cada
   error se muestra **debajo de su campo**, enlazado con `aria-describedby`, y el campo recibe
   `aria-invalid`. El foco va al primer campo con error. Si hay errores no se hace `fetch`.
2. Si es válido: `fetch('/api/solicitudes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })`.
   Durante la petición el botón de enviar queda **deshabilitado** y dice «Enviando…»; los campos también.
3. **200** → se muestra «¡Gracias! Recibimos tu solicitud…», se **limpia el formulario** y se **cierra el
   modal**. Como al cerrar el modal el mensaje desaparecería, el éxito se anuncia fuera del modal: un
   aviso en la propia sección (`role="status"`) que queda visible unos segundos.
4. **400 con `fields`** → los mensajes del servidor se muestran bajo sus campos. **429 / 500 / error de red**
   → mensaje de error general dentro del modal (`role="alert"`), el formulario **conserva lo escrito**, el
   botón se rehabilita.
5. Cerrar el modal con Esc o clic fuera **no** borra lo escrito; solo el éxito lo limpia.
6. Si la persona cambia de card (otra instancia), cada formulario es independiente.

### 7.4 Criterios de aceptación

| ID       | Criterio                                                                                                                                              |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-S3-1  | «Crear cuenta» abre el modal con el rol «Editor» preseleccionado; «Donar» lo abre con «Donador». Ninguno navega.                                      |
| AC-S3-2  | El modal se cierra con Esc y con el botón de cierre, devuelve el foco al botón que lo abrió y atrapa el foco mientras está abierto.                   |
| AC-S3-3  | Enviar vacío muestra un mensaje bajo cada campo obligatorio (nombre, teléfono, rol si se borró, motivo, consentimiento) y **no** hace `fetch`.        |
| AC-S3-4  | El contador del motivo muestra `n / 1000` y no permite superar 1000.                                                                                  |
| AC-S3-5  | Mientras se envía, el botón está deshabilitado y no se puede duplicar el envío con doble clic.                                                        |
| AC-S3-6  | En 200 el formulario queda vacío, el modal cerrado y aparece el aviso de éxito en español.                                                            |
| AC-S3-7  | En 400, 429, 500 y error de red aparece un mensaje en español, se conserva lo escrito y el botón vuelve a estar activo.                               |
| AC-S3-8  | El honeypot está en el DOM, fuera de pantalla, sin `display:none`, con `tabIndex=-1` y `aria-hidden`; Tab nunca cae en él; su valor viaja en el POST. |
| AC-S3-9  | El modal es usable a 360 px de ancho (sin scroll horizontal) y el contenido largo se desplaza dentro del modal.                                       |
| AC-S3-10 | El cuerpo del POST tiene las claves de §5.1 y `email` vacío viaja como `""` o ausente.                                                                |
| AC-S3-11 | Bajo el checkbox hay un enlace a `/privacidad` que abre en pestaña nueva; el formulario conserva lo escrito.                                          |

---

## 8. S4 — Política de privacidad

Una página estática, `/privacidad`, que muestra el texto de [docs/politica-privacidad.md](../docs/politica-privacidad.md)
(ese archivo es la fuente de verdad; la página lo transcribe). Es un componente de servidor, sin estado,
con el mismo estilo tipográfico y de contenedor que el resto del sitio (`max-w`, títulos y listas con las
clases ya usadas) y `metadata` con título «Política de privacidad».

Qué dice el texto (resumen): quién es responsable y cómo contactarlo; qué datos se guardan (nombre,
teléfono, email opcional, rol, motivo, consentimiento, fecha) y que la IP se usa solo para limitar envíos
y se conserva cerca de una hora en Upstash; para qué se usan (contactar sobre la solicitud, nada más);
base (el consentimiento); proveedores (Supabase, Upstash, Vercel) y posible procesamiento fuera del Perú;
quién ve los datos; cuánto tiempo se guardan; derechos de acceso, corrección, borrado y oposición,
atendidos **a mano** por correo (decisión #13).

**Lo que el borrador no sabe** y el equipo debe completar (aparece entre `[CORCHETES]` en el texto): el
nombre del responsable, el correo de contacto, la fecha de publicación, la región de los servidores, el
plazo de respuesta y, si se quiere, un plazo máximo de conservación. **No se publica con corchetes sin
completar** (AC-S4-3).

### 8.1 Criterios de aceptación

| ID      | Criterio                                                                                                                                       |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-S4-1 | `/privacidad` responde 200 y muestra el título y las nueve secciones de la política.                                                           |
| AC-S4-2 | Los textos de la página coinciden con `docs/politica-privacidad.md` (mismas secciones y mismos datos).                                         |
| AC-S4-3 | Ni la página ni el documento contienen marcadores `[...]` sin completar antes de publicar en producción.                                       |
| AC-S4-4 | El texto declara exactamente los datos que guarda S1 (nombre, teléfono, email, rol, motivo, consentimiento, fecha) y el uso temporal de la IP. |
| AC-S4-5 | La página es legible a 360 px de ancho y tiene un único `h1`.                                                                                  |

---

## 9. Comandos

```bash
nvm use                      # Node >= 22
pnpm install
pnpm dev                     # http://localhost:3000, lee .env.local
pnpm check:fast              # tras cada edición: tipos, lint, piso, idioma
pnpm test                    # unitarios (vitest)
pnpm test:coverage && pnpm check:coverage   # ≥ 80 % de las líneas tocadas
pnpm test:e2e                # Playwright
pnpm check:task              # al terminar cada tarea
```

Dependencias nuevas (**pedir visto bueno**, ver §11): `zod`, `@supabase/supabase-js`,
`@upstash/ratelimit`, `@upstash/redis`, `server-only`.

```bash
pnpm add zod @supabase/supabase-js @upstash/ratelimit @upstash/redis server-only
pnpm dlx shadcn@latest add dialog textarea label checkbox select
```

---

## 10. Estrategia de pruebas

Marco: Vitest + Testing Library (unitarios en `tests/unit/`), Playwright (e2e en `tests/e2e/`).
CONSTRAINTS.md pide ≥ 80 % de cobertura en las líneas cambiadas (hoy avisa); `src/components/**` está
excluido de la cobertura, así que el peso va en `src/lib/` y `src/app/api/`.

| Nivel      | Qué cubre                                                                        | Cómo                                                                                                                                                                            |
| ---------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unitario   | `requestSchema` (cada regla y los bordes de AC-S2-6/7), lectura de IP.           | Funciones puras, sin red.                                                                                                                                                       |
| Unitario   | Handler `POST`: AC-S2-1…12.                                                      | Se llama `POST(new Request(...))` como en `tests/unit/dictionary/api.test.ts`; `vi.mock` de `@/lib/supabase-admin` y de `rate-limit`. Nunca se toca Supabase ni Upstash reales. |
| Componente | Formulario: validación, estados de carga/éxito/error, honeypot (AC-S3-3…8).      | Testing Library con `fetch` simulado. `Select` de base-ui es incómodo en jsdom: la lógica va en funciones puras y el selector se ejerce en e2e.                                 |
| E2E        | Abrir el modal desde cada card, enviar, ver éxito y error (AC-S3-1, 2, 6, 7, 9). | `page.route('**/api/solicitudes', ...)`: no hay Supabase en CI.                                                                                                                 |
| Manual     | AC-S1-1…7 y un envío real de punta a punta con Upstash real.                     | Una vez, con un nombre reconocible («PRUEBA»); como Preview y producción comparten proyecto (decisión #11), se borra la fila a mano después.                                    |

Reglas del piso (CONSTRAINTS.md): sin `@ts-ignore`/`eslint-disable`, sin tests saltados, sin `catch {}`
vacío (los `catch` registran con `console.error`), sin `TODO` en el código.

---

## 11. Límites

**Siempre**

- Validar en el servidor aunque el cliente ya validó.
- Leer `docs` de Next.js en `node_modules/next/dist/docs/` antes de escribir el handler (AGENTS.md).
- Correr `pnpm check:fast` tras editar y `pnpm check:task` al cerrar cada tarea.
- Mantener los textos para personas en español y el código en inglés.
- Registrar errores del servidor sin incluir el cuerpo de la solicitud.

**Pedir antes**

- Agregar dependencias (§9) o componentes de `ui/`.
- Cambiar el esquema de la tabla, o activar políticas RLS.
- Tocar CI, hooks o `CONSTRAINTS.md`.
- Enviar notificaciones (correo, WhatsApp) cuando llegue una solicitud.

**Nunca**

- Importar `supabase-admin` desde un componente cliente, ni nombrar con `NEXT_PUBLIC_` una variable secreta.
- Commitear `.env.local` o una clave; devolver filas o errores crudos de Supabase.
- Loguear teléfono, nombre, email o motivo.
- Debilitar `CONSTRAINTS.md` para que algo pase.

---

## 12. Decisiones resueltas y preguntas abiertas

**Resueltas** (2026-10-05): claves JSON en español (#9) · Preview comparte proyecto con producción (#11) ·
`revoke` incluido en el SQL (§4.1) · política de privacidad escrita y publicada en `/privacidad` (#12) ·
borrado manual (#13) · el bloque comentado de Voluntarios no se toca (#14).

**Abiertas** (no bloquean S1, S2 ni S3; sí bloquean publicar S4):

1. **Datos de la política.** Nombre del responsable, correo de contacto, fecha de publicación, región de los
   servidores, plazo de respuesta y plazo máximo de conservación (§8). El borrador del texto los deja entre
   `[CORCHETES]`.
2. **Revisión del texto.** La política es un borrador técnico, no una opinión legal. ¿Quién del proyecto la
   revisa antes de publicar? También conviene confirmar si la Ley 29733 de protección de datos personales
   exige algún trámite adicional para un proyecto de este tipo (por ejemplo, registrar el banco de datos);
   no lo sé y no lo afirmo.
3. **Menores de edad.** El formulario no pide edad. ¿Se quiere aclarar en la política que es para mayores de
   18 años?
4. **Enlace a la política desde otros lugares.** Hoy solo se enlaza desde el consentimiento. ¿También desde el
   footer?
5. **Dónde se leen las solicitudes.** Queda el _Table Editor_ de Supabase; sin aviso al llegar una nueva.
   ¿Alcanza para el arranque?
