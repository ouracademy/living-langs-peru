# Pruebas de las solicitudes de apoyo

> Fecha: 2026-10-14 · Spec: [specs/solicitudes.md](../specs/solicitudes.md) · Plan: [tasks/solicitudes/](../tasks/solicitudes/)
> Registro de lo que se verificó a mano contra el Supabase real y de lo que quedó pendiente de una
> persona. Las pruebas automáticas están en `tests/unit/requests/`, `tests/unit/privacy/` y
> `tests/e2e/`.

## Base de datos (S1) — 2026-10-12

Probado con `curl` contra el proyecto real:

| Prueba                                                                                 | Resultado                         |
| -------------------------------------------------------------------------------------- | --------------------------------- |
| `service_role`: insert válido                                                          | `201`                             |
| `service_role`: select y delete                                                        | `403` con `42501` (solo `INSERT`) |
| Base: `rol = 'voluntario'`, motivo de 9 y de 1001 caracteres, `consentimiento = false` | `400` con `23514`                 |
| `anon` (publishable key): insert y select                                              | `401` con `42501`                 |
| Permisos de la tabla (consulta a `information_schema`)                                 | confirmado por el equipo          |

Hallazgo: en este proyecto la `service_role` no recibía `SELECT` ni `INSERT` sobre la tabla nueva, y las
tres tablas de la API conservaban `REFERENCES`, `TRIGGER` y `TRUNCATE`. El SQL de
[solicitudes-schema.sql](./solicitudes-schema.sql) cierra todo y concede solo `INSERT`.

## Endpoint (S2) — 2026-10-12

Probado contra el servidor de desarrollo con las variables reales:

| Envío      | Resultado                                                                  |
| ---------- | -------------------------------------------------------------------------- |
| Válido     | `200`, una fila guardada (confirmada por el equipo en el _Table Editor_)   |
| Inválido   | `400` con un mensaje en español por campo                                  |
| Honeypot   | `200` con el mismo cuerpo que el éxito real; **no** se guardó ninguna fila |
| No es JSON | `400` con `invalid_json`                                                   |
| `GET`      | `405`                                                                      |

## Formulario (S3) y cierre — 2026-10-14

- **Punta a punta con el Supabase real**, desde la portada, sobre el build de producción (`pnpm build` +
  `pnpm start`): se abrió «Crear cuenta», se llenó el formulario con el nombre `PRUEBA F5`, se envió y la
  API respondió `POST 200`. El modal se cerró y apareció el aviso «¡Gracias!…». El servidor no registró
  nada en el log.
- **Pendiente de una persona:** confirmar en el _Table Editor_ que existe una fila `PRUEBA F5` con los
  datos correctos y **borrarla** (la `service_role` no puede borrar).
- **No se probó** el deploy de Preview de Vercel: no hay forma de desplegarlo desde esta sesión. Antes de
  mergear, repetir el envío desde la URL de Preview con el nombre `PRUEBA` y borrar la fila.

## Auditoría

| Revisión                                                                            | Resultado                                                                                        |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| La `service_role` key en archivos versionados                                       | 0 coincidencias                                                                                  |
| La `service_role` key, `SERVICE_ROLE` o «supabase» en el bundle del cliente         | 0 coincidencias                                                                                  |
| `.env.local` versionado; patrón JWT `eyJ…` o `sb_secret_` en archivos versionados   | 0 coincidencias                                                                                  |
| `console.*` en el endpoint, `lib/requests`, `supabase-admin` y los componentes      | 2, ambos sin datos personales (el código del error, o el mensaje de una excepción de red/config) |
| `NEXT_PUBLIC_` con variables de Supabase; componentes que importan `supabase-admin` | ninguno                                                                                          |
| `gitleaks` y `osv-scanner`                                                          | **no corrieron**: no están instalados en esta máquina; en CI siempre corren                      |

## Estado de la suite

`pnpm check:task`: 423 pruebas unitarias, cobertura del cambio 93,9 %. `pnpm format:check` limpio.
E2E: 109 pruebas, todas pasan contra el build de producción.

## Confirmación del equipo — 2026-10-16

El equipo confirmó que la fila `PRUEBA F5` existía con los datos correctos y la borró, que el texto de la
política fue revisado (H4) y que el envío desde Preview funcionó. Con eso se mergeó `feat/solicitudes` a `main`.
