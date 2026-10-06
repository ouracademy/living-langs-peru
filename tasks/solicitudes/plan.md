# Plan de implementación — Solicitudes de apoyo (donador / editor)

> Spec: [specs/solicitudes.md](../../specs/solicitudes.md) · Fecha: 2026-10-06 · Rama base: `main`
> Lista de tareas ejecutable: [tasks/solicitudes/todo.md](./todo.md)

---

## 1. Cómo se corta el trabajo

El mapa del spec (§3) dice **qué depende de qué**: S1 base de datos, S2 endpoint, S4 política, S3
formulario. Tomado literalmente da un plan por capas (toda la base, todo el endpoint, toda la
interfaz) y recién al final alguien puede **ver** algo. Este plan corta **vertical**: cada fase
termina con algo que funciona de punta a punta, aunque sea parcial.

```
F1 tabla + entorno ──> F2 endpoint (curl guarda y rechaza)
                           │
F3 página /privacidad ─────┤   (independiente; puede ir en paralelo con F2)
                           ▼
                       F4 modal ─> formulario ─> envío real
                           │
                       F5 cierre: e2e, build, prueba real, docs
```

Las etiquetas `S1..S4` se conservan en cada tarea para trazar con el spec.

**Por qué el modal se parte en tres tareas (F4).** El modal es lo único que ve el usuario y toca un
archivo ya existente (`support.tsx`). Primero se abre el modal vacío con el rol correcto (se ve en la
portada), después se agrega la validación sin red, y al final se conecta al endpoint. Si algo del estilo
de `ui/` sale mal, se descubre en la primera tarea y no después de escribir el formulario entero.

## 2. Orden y dependencias

| Fase | Capacidad | Depende de | Qué se puede mostrar al terminar                                    |
| ---- | --------- | ---------- | ------------------------------------------------------------------- |
| F1   | S1        | —          | Una fila insertada a mano; la `anon` key no puede leer ni escribir. |
| F2   | S2        | F1         | `curl` guarda una fila real y rechaza datos inválidos con mensajes. |
| F3   | S4        | —          | `/privacidad` abre, estática, con el texto del borrador.            |
| F4   | S3        | F2, F3     | Desde la portada se envía una solicitud y aparece en Supabase.      |
| F5   | todo      | F1–F4      | `pnpm check:full` en verde y una prueba real documentada.           |

F3 no depende de nada, pero **F4 enlaza a ella**, así que F3 va antes de F4.

## 3. Decisiones de implementación

Lo que el spec deja abierto o que solo se ve al escribir el código.

1. **Un solo esquema Zod, dos usos.** `src/lib/requests/schema.ts` lo importan el handler y el
   formulario. El cliente trae Zod al bundle; es el costo de que las reglas nunca diverjan. Si pesa de
   más (se mide en F5), se pasa a funciones de validación a mano, con los mismos tests.
2. **Tests primero en el esquema.** Los bordes de §5.2 (7/15 dígitos, `+` solo al inicio, emojis en el
   motivo, 999/1001) son justo donde se rompe. Se escriben en rojo antes de la regla.
3. **Handler con dependencias inyectables por módulo.** El handler importa `supabaseAdmin` de
   `@/lib/supabase-admin`; los tests lo simulan con `vi.mock`. Sin capa extra de repositorio: para un
   `insert` no se justifica.
4. **El módulo de Supabase lanza al importarse si faltan variables.** El handler lo carga con `import`
   estático dentro de un `try/catch` en el flujo de insert: un `import` que lanza rompe todo el módulo
   de la ruta, no solo la solicitud. Se resuelve creando el cliente de forma perezosa
   (`getSupabaseAdmin()`) en vez de a nivel de módulo. **Esto cambia el snippet del spec §5.3**; se
   actualiza el spec en F2 si se confirma en la práctica.
5. **El aviso de éxito vive en el cliente de la sección**, fuera del modal (§7.3 punto 3). Se resuelve
   con un componente cliente pequeño que contiene los dos modales y el aviso; `Support` sigue siendo
   servidor. Si hace estorbo, el aviso baja a un estado compartido en ese componente.
6. **`Select` de base-ui en jsdom.** Se asume incómodo (spec §10). La lógica va en funciones puras
   (`validateForm`, `buildPayload`) con tests; el `Select` real se ejerce en e2e.
7. **No tocar el bloque comentado de Voluntarios** en `support.tsx` (decisión #14). Las ediciones se
   hacen con `Edit` sobre las líneas de `options` y del footer, nunca reescribiendo el archivo.

## 4. Riesgos

| Riesgo                                                                            | Prob. | Impacto | Mitigación                                                                                                    |
| --------------------------------------------------------------------------------- | ----- | ------- | ------------------------------------------------------------------------------------------------------------- |
| El CLI de shadcn genera componentes sobre Radix y no sobre `@base-ui/react`       | Media | Medio   | T4.1 lo comprueba primero. Si falla: se escriben a mano siguiendo `sheet.tsx` (misma primitiva `Dialog`).     |
| Un `import` de `supabase-admin` en un componente cliente                          | Baja  | Alto    | `import "server-only"` rompe el build; AC-S1-6 lo verifica con `grep`.                                        |
| La política se publica con `[CORCHETES]` sin completar                            | Alta  | Alto    | **No se mergea F3 a `main` hasta completar los datos** (§5, checkpoint 3). AC-S4-3 lo comprueba.              |
| Merge a `main` despliega a producción y el formulario apunta a una base sin tabla | Media | Alto    | F1 se completa y verifica **antes** de mergear F2. Las variables de Vercel se cargan antes del primer deploy. |
| Preview comparte base con producción: una prueba deja una fila real               | Alta  | Bajo    | Probar con el nombre «PRUEBA» y borrar la fila a mano (T5.4).                                                 |
| Spam sin límite por IP                                                            | Baja  | Bajo    | Riesgo aceptado (spec §6). Plan B ya escrito: Firewall de Vercel → Turnstile → límite por IP.                 |
| El motivo con emojis pasa Zod y falla el `check` de Postgres (500)                | Media | Medio   | Conteo con `[...value].length` y test en rojo primero (T2.1).                                                 |
| El `Select` de base-ui no deja enviar `value` por `name` (formulario controlado)  | Baja  | Bajo    | El formulario es controlado por estado; el `payload` se arma del estado, no del `FormData`.                   |

## 5. Puertas humanas

| #   | Cuándo      | Quién / qué                                                                                                                          |
| --- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| H1  | Antes de F1 | Crear el proyecto de Supabase (o elegir el existente), pegar el SQL de §4.1 y copiar `SUPABASE_URL` y `service_role` key.            |
| H2  | Antes de F2 | Cargar las dos variables en `.env.local` y en Vercel (Production + Preview, `service_role` como Sensitive).                          |
| H3  | Antes de F5 | Completar los datos de `docs/politica-privacidad.md`: responsable, correo, fecha, región, plazo de respuesta, plazo de conservación. |
| H4  | Antes de F5 | Que alguien del proyecto lea la política (el borrador no es opinión legal) y confirme si la Ley 29733 pide algún trámite.            |

Sin H3 y H4 el código se puede construir y probar, pero **no se mergea a `main`**.

## 6. Definición de terminado (cada tarea)

1. `pnpm check:fast` en verde tras editar.
2. `pnpm check:task` en verde al cerrar la tarea (tests unitarios y cobertura de lo tocado).
3. Los criterios `AC-…` de la tarea pasan, y están citados en el commit o en el test.
4. Código en inglés, texto para personas en español (`pnpm check:language`).
5. Commit en Conventional Commits, un commit por tarea, con las dos líneas de atribución del proyecto.

Al cerrar la feature, además: `pnpm check:full`, `pnpm build` con `/privacidad` estática (`○`) y
`/api/solicitudes` dinámica (`ƒ`), y una prueba real de punta a punta (T5.4).

## 7. Cambios en archivos existentes

Solo dos, y con cuidado:

- `src/components/support.tsx`: se reemplazan `href` y `<Link>` por el modal. **No se toca el bloque
  comentado de Voluntarios.**
- `specs/README.md` y `specs/solicitudes.md`: estado `aprobado` ahora, `implementado` al cerrar F5.

El resto son archivos nuevos. Las dependencias (`zod`, `@supabase/supabase-js`, `server-only`) y los
componentes `ui/` se agregan en la tarea que los usa por primera vez, no todas al inicio.
