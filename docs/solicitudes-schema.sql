-- Tabla de solicitudes de apoyo (donador / editor).
-- Spec: specs/solicitudes.md §4.1 · Se pega en el SQL Editor de Supabase; el código no lo ejecuta.
-- Corrido en Supabase el: 2026-10-12 (tabla creada antes; permisos aplicados y verificados ese día).

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

-- Permisos de tabla. Supabase ya no concede permisos de lectura/escritura a las
-- tablas nuevas, pero sí deja REFERENCES, TRIGGER y TRUNCATE a todos los roles
-- de la API. Se cierra todo y se abre solo lo que el servidor necesita: insertar.
-- Además actúa como segunda barrera si alguien crea por error una política RLS
-- permisiva más adelante.
revoke all on public.solicitudes from anon, authenticated, service_role;
grant insert on public.solicitudes to service_role;
