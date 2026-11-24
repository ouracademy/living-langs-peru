# Saltapalabras — pruebas manuales y SQL

> Spec: [specs/saltapalabras.md](../specs/saltapalabras.md) · Plan:
> [tasks/saltapalabras/plan.md](../tasks/saltapalabras/plan.md)
> Este archivo crece por fase. Hoy: el test SQL (F1a) y cómo jugar en local con datos de prueba.

## 1. Test SQL del bloque SP3

`docs/saltapalabras-schema.test.sql` comprueba AC-SP3-1 a AC-SP3-6 y que el historial no se puede
modificar. Corre dentro de una transacción que se deshace: no deja datos.

**No se corre contra Supabase real** (Preview y producción comparten la base). Se corre en un
Postgres local con los tres roles de la API simulados:

```bash
# Un clúster de usar y tirar, en una carpeta temporal y un puerto libre.
initdb -D /tmp/pg-saltapalabras -U postgres --auth=trust -E UTF8
pg_ctl -D /tmp/pg-saltapalabras -o "-p 54330 -c listen_addresses=127.0.0.1" -l /tmp/pg.log start

psql -h 127.0.0.1 -p 54330 -U postgres <<'SQL'
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant usage on schema public to anon, authenticated, service_role;
-- Como Supabase: lo nuevo se concede a los roles de la API, y el esquema tiene que revocarlo.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
SQL

psql -h 127.0.0.1 -p 54330 -U postgres -v ON_ERROR_STOP=1 -f docs/saltapalabras-schema.sql
psql -h 127.0.0.1 -p 54330 -U postgres -f docs/saltapalabras-schema.test.sql
# → «saltapalabras-schema.test.sql: todas las aserciones pasan»

pg_ctl -D /tmp/pg-saltapalabras stop
```

### Registro

| Fecha      | Postgres | Resultado                                                                                                                                                            |
| ---------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-18 | 18.3     | Pasa entero. Con los `grant` originales del spec (solo `select`), la publicación falla con «permiso denegado» (T0.6). Con una tabla abierta a `anon`, el test falla. |

## 2. Jugar en local con datos de prueba

Sin Supabase real: el mismo Supabase falso de los e2e sirve un paquete de **prueba**
(`tests/e2e/fixtures/word-jump-pack.json`, palabras marcadas «PRUEBA»).

> **Nota del 2026-11-23 (gestor-lenguas F4):** ese paquete de prueba ya no existe. El Supabase
> falso empieza sin nada publicado, así que el juego muestra el paquete de lengua del repo
> (`src/data/bundles/ashaninka.json`, palabras reales y verificadas). Para jugar con palabras
> «PRUEBA», subir `tests/e2e/fixtures/uro-bundle-prueba.json` en `/admin/lenguas/uro` y publicarlo;
> para eso, `pnpm start` necesita además `ADMIN_USER` y `ADMIN_PASSWORD` (los e2e usan `e2e-editor` /
> `e2e-not-a-secret`).

```bash
# Terminal 1: el Supabase falso
node tests/e2e/fake-supabase.mjs            # escucha en 127.0.0.1:54329

# Terminal 2: el sitio apuntando al falso (build + start, como en los e2e)
SUPABASE_URL=http://127.0.0.1:54329 SUPABASE_SERVICE_ROLE_KEY=e2e-not-a-key pnpm build
SUPABASE_URL=http://127.0.0.1:54329 SUPABASE_SERVICE_ROLE_KEY=e2e-not-a-key pnpm start -p 3200
```

Abrir http://localhost:3200/juegos/saltapalabras → «Jugar en Asháninka» → «Tema de prueba».

Si `.env.local` tiene variables reales de Supabase, las de la línea de comandos mandan sobre ellas
para ese proceso; aun así, comprobar que el paquete que se ve es el de «PRUEBA».

## 3. Pendiente (fases siguientes)

- H1: correr el bloque SP3 en Supabase real y anotar la fecha en `docs/saltapalabras-schema.sql`.
- F4 (T4.1): checklist contra Supabase real sin publicar paquetes de prueba, prueba de AC-SP3-11
  (pausar el proyecto) y cómo reactivar Supabase (H6).
