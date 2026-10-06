# TODO — Solicitudes de apoyo (donador / editor)

> Plan y razonamiento: [tasks/solicitudes/plan.md](./plan.md) · Spec: [specs/solicitudes.md](../../specs/solicitudes.md)
> Estado: **sin empezar.** Siguiente: **H1** (proyecto de Supabase) y después **F1**.

Cada tarea cierra cuando pasan sus criterios **y** la definición de terminado (plan §6):
`pnpm check:fast` · `pnpm check:task` · commit propio.

**Reglas que no se negocian en ninguna tarea:**

1. **`supabase-admin` nunca se importa desde un componente cliente**, y ninguna variable secreta lleva
   `NEXT_PUBLIC_`.
2. **No se loguea** nombre, teléfono, email ni motivo.
3. **No se toca el bloque comentado de Voluntarios** en `support.tsx`.
4. **Identificadores en inglés**, texto para personas en español (`CONSTRAINTS.md`).
5. **Pedir visto bueno antes de agregar una dependencia.** Ya está pedido y aprobado el spec §9 (`zod`,
   `@supabase/supabase-js`, `server-only`); cualquier otra, se pregunta.

Antes de empezar: `git status` (hay cambios sin commitear del usuario en `support.tsx` y
`resources.tsx`; **no se mezclan** en los commits de esta feature) y rama `feat/solicitudes`.

---

## H1 — Proyecto de Supabase (humano)

- [ ] **H1.1** Crear (o elegir) el proyecto de Supabase.
- [ ] **H1.2** Copiar `Project URL` y la `service_role` key. **No** pegarlas en el chat ni en un commit.

---

## F1 — Tabla lista y verificada (S1)

- [ ] **T1.1** Guardar el SQL de spec §4.1 en `docs/solicitudes-schema.sql` (referencia; el código no lo ejecuta) y correrlo en el _SQL Editor_ de Supabase. Incluye el `revoke` `[AC-S1-1]`
- [ ] **T1.2** Verificar con la `service_role`: insertar una fila válida a mano `[AC-S1-2]`
- [ ] **T1.3** Verificar con la `anon` key (REST): insertar y leer fallan, no crean ni devuelven filas `[AC-S1-3, AC-S1-4]`
- [ ] **T1.4** Verificar los `check`: `rol = 'voluntario'`, motivo de 9 y 1001, `consentimiento = false` son rechazados `[AC-S1-5]`
- [ ] **T1.5** Prueba del `revoke`: crear una política permisiva **de prueba**, comprobar que `anon` sigue sin acceso, **borrar la política** `[AC-S1-7]`
- [ ] **T1.6** Borrar la fila de prueba. Anotar en `docs/solicitudes-schema.sql` la fecha en que se corrió.

> **⛔ Checkpoint 1** — la tabla existe, está cerrada a `anon` y a `authenticated`, y nadie dejó una
> política de prueba. Se confirma mirando _Authentication → Policies_ en Supabase.

## H2 — Variables de entorno (humano)

- [ ] **H2.1** `.env.local` con `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (spec §4.2).
- [ ] **H2.2** Vercel → _Settings → Environment Variables_: las mismas dos en **Production** y **Preview**; `service_role` como **Sensitive**. Redeploy.

---

## F2 — Endpoint que guarda y rechaza (S2)

- [ ] **T2.1** `pnpm add zod @supabase/supabase-js server-only`. `src/lib/requests/schema.ts` con `requestSchema`, tipos y mensajes en español. **Tests primero, en rojo:** cada regla de spec §5.2 y los bordes (7/15 dígitos, `+` en medio, 9/10/1000/1001 caracteres, 5 emojis, `email: ""`) `[AC-S2-4, AC-S2-6, AC-S2-7]`
- [ ] **T2.2** `src/lib/supabase-admin.ts` con `import "server-only"`, creación **perezosa** (`getSupabaseAdmin()`, plan §3.4) y `auth: { persistSession: false, autoRefreshToken: false }`. Si cambia el snippet de spec §5.3, actualizar el spec `[AC-S1-6]`
- [ ] **T2.3** `src/app/api/solicitudes/route.ts`: JSON válido → honeypot → validación → insert. Éxito y honeypot devuelven **el mismo** cuerpo. Errores con los códigos de spec §5.1. **Tests primero** con `vi.mock('@/lib/supabase-admin')`, llamando `POST(new Request(...))` como en `tests/unit/dictionary/api.test.ts` `[AC-S2-1, AC-S2-2, AC-S2-3, AC-S2-5, AC-S2-8, AC-S2-9]`
- [ ] **T2.4** Leer `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` antes de T2.3 y confirmar que `POST` no se cachea ni se prerrenderiza.
- [ ] **T2.5** Verificar a mano con `curl` y las variables reales: un envío válido crea una fila (nombre «PRUEBA»); uno inválido devuelve 400 con `fields`; el honeypot devuelve 200 **sin** crear fila `[AC-S2-1, AC-S2-3, AC-S2-4]`
- [ ] **T2.6** `grep -rn "NEXT_PUBLIC_" src/` y `grep -rn "supabase-admin" src/components/` → vacíos `[AC-S1-6]`

> **⛔ Checkpoint 2** — `curl` guarda y rechaza contra Supabase real. Se borra la fila de prueba.
> No se mergea nada a `main` todavía: el formulario aún no existe.

---

## F3 — Página de privacidad (S4) · puede ir en paralelo con F2

- [ ] **T3.1** `src/app/privacidad/page.tsx`: componente de servidor, `metadata` «Política de privacidad», un único `h1`, las nueve secciones de `docs/politica-privacidad.md`, mismo contenedor y tipografía que el resto del sitio `[AC-S4-1, AC-S4-2, AC-S4-5]`
- [ ] **T3.2** E2E `tests/e2e/privacy.spec.ts`: la página abre, tiene `h1`, nueve encabezados `h2`, y a 360 px no hay scroll horizontal `[AC-S4-1, AC-S4-5]`
- [ ] **T3.3** Comprobar que el texto declara lo mismo que guarda la tabla y **no** menciona la IP `[AC-S4-4]`
- [ ] **T3.4** `pnpm build`: `/privacidad` sale **estática** (`○`).

> **⛔ Checkpoint 3 · H3/H4** — el equipo completa los `[CORCHETES]` y alguien revisa el texto. Sin
> esto, F3 **no se mergea a `main`**. Las tareas de F4 y F5 sí pueden avanzar en la rama.

---

## F4 — Modal, formulario y envío real (S3)

- [ ] **T4.1** `pnpm dlx shadcn@latest add dialog textarea label checkbox select`. **Comprobar** que los archivos nuevos usan `@base-ui/react` (como `sheet.tsx`) y no Radix. Si no, escribirlos a mano. Revisar el estilo contra `input.tsx` y `button.tsx` `[AC-S3-2]`
- [ ] **T4.2** **Modal vacío con el rol correcto.** `support-request-dialog.tsx`: `Dialog` con título y descripción en español; el botón conserva el aspecto (`rounded-full px-5 py-2.5`). `support.tsx`: reemplazar `href` y `<Link>` por el modal (**sin tocar el bloque comentado**). «Crear cuenta» → `editor`; «Donar» → `donador` `[AC-S3-1, AC-S3-2]`
- [ ] **T4.3** **Formulario sin red.** `support-request-form.tsx`: los seis campos, contador `n / 1000` por caracteres Unicode, honeypot `website` (`absolute -left-[9999px]`, `tabIndex={-1}`, `aria-hidden`, sin `display:none`), enlace a `/privacidad` bajo el checkbox con `target="_blank" rel="noopener"`. Funciones puras `validateForm` y `buildPayload` con **tests primero** `[AC-S3-3, AC-S3-4, AC-S3-8, AC-S3-10, AC-S3-11]`
- [ ] **T4.4** **Mensajes de error bajo cada campo** con `aria-describedby` y `aria-invalid`; el foco va al primer campo con error; sin errores no hay `fetch` `[AC-S3-3]`
- [ ] **T4.5** **Envío.** `fetch('/api/solicitudes', { method: 'POST' })`; botón deshabilitado y «Enviando…» durante la petición; 400 con `fields` → mensajes bajo los campos; 500 o error de red → alerta general, el formulario conserva lo escrito; 200 → limpia, cierra el modal y muestra el aviso de éxito fuera del modal (`role="status"`) `[AC-S3-5, AC-S3-6, AC-S3-7]`
- [ ] **T4.6** Tests de componente con `fetch` simulado: 200, 400, 500 y error de red; doble clic no duplica el envío `[AC-S3-5, AC-S3-6, AC-S3-7]`
- [ ] **T4.7** E2E `tests/e2e/support-request.spec.ts` con `page.route('**/api/solicitudes', …)`: abrir desde cada card, enviar vacío, enviar válido, error del servidor, Esc cierra y devuelve el foco, 360 px sin scroll horizontal `[AC-S3-1, AC-S3-2, AC-S3-6, AC-S3-7, AC-S3-9]`
- [ ] **T4.8** Verificar en navegador (`pnpm dev`): estilo coherente con las cards, teclado completo, modal usable en celular.

> **⛔ Checkpoint 4** — alguien usa el formulario real desde la portada y la solicitud aparece en
> Supabase. Se borra la fila de prueba.

---

## F5 — Cierre

- [ ] **T5.1** `pnpm check:full` en verde (si falta Chromium: `sudo apt-get install -y libnspr4 libnss3 libasound2t64`).
- [ ] **T5.2** `pnpm build`: `/privacidad` estática (`○`), `/api/solicitudes` dinámica (`ƒ`). Medir cuánto agrega Zod al bundle del cliente; si molesta, plan §3.1.
- [ ] **T5.3** Auditoría de secretos y logs: `pnpm check:secrets`; `grep -rn "console\." src/app/api/solicitudes src/lib` y confirmar que ningún log incluye datos personales `[spec §11]`
- [ ] **T5.4** Prueba real en el deploy de Preview con el nombre «PRUEBA»; borrar la fila a mano. Anotar el resultado en `docs/solicitudes-pruebas.md` `[AC-S1-1…7, AC-S2-1…9]`
- [ ] **T5.5** Actualizar `specs/solicitudes.md` y `specs/README.md` a **implementado** con la fecha, y marcar este todo.
- [ ] **T5.6** Confirmar que H3 y H4 están cerrados antes de mergear a `main`.

> **⛔ Checkpoint 5 · cierre** — todos los criterios `AC-S1-*`, `AC-S2-*`, `AC-S3-*` y `AC-S4-*` pasan, la
> política no tiene corchetes (`AC-S4-3`) y se puede mergear.

---

## Fuera de alcance (no se hace en esta feature)

Límite por IP, CAPTCHA, notificación al equipo, panel de administración, endpoint de borrado, evitar
duplicados, funciones de Postgres. Si alguna aparece como necesidad, va a un spec nuevo.
