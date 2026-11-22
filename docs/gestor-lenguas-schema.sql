-- Gestor de contenido de lenguas: paquetes de lengua publicados e historial.
-- Spec: specs/gestor-lenguas.md §6.1 · Plan: tasks/gestor-lenguas/plan.md
-- Se pega en el SQL Editor de Supabase; el código no lo ejecuta.
-- Tests: docs/gestor-lenguas-schema.test.sql (se corre como el de Saltapalabras:
-- docs/saltapalabras-pruebas.md, Postgres local con los roles de la API simulados).
--
-- Corrido en Supabase el: (pendiente, H1)

-- ─── Tablas ───────────────────────────────────────────────────────────────────
-- One row per language with its published bundle (language-bundle/1), and an
-- immutable history. Only two languages exist (spec decision #1).

create table public.language_bundles (
  slug         text        primary key check (slug in ('ashaninka', 'uro')),
  version      integer     not null check (version >= 1),
  bundle       jsonb       not null,
  note         text        not null check (char_length(btrim(note)) between 1 and 500),
  published_at timestamptz not null default now(),
  check (bundle ->> 'schema' = 'language-bundle/1'),
  check (bundle ->> 'language' = slug),
  check (jsonb_typeof(bundle -> 'entries') = 'array'),
  check (jsonb_typeof(bundle -> 'themes') = 'array'),
  -- Serialized size, the same thing the server checks (spec decision #14).
  check (octet_length(bundle::text) < 2097152)
);

create table public.bundle_versions (
  slug         text        not null check (slug in ('ashaninka', 'uro')),
  version      integer     not null check (version >= 1),
  bundle       jsonb       not null,
  note         text        not null check (char_length(btrim(note)) between 1 and 500),
  published_at timestamptz not null default now(),
  primary key (slug, version),
  check (bundle ->> 'schema' = 'language-bundle/1'),
  check (bundle ->> 'language' = slug),
  check (jsonb_typeof(bundle -> 'entries') = 'array'),
  check (jsonb_typeof(bundle -> 'themes') = 'array'),
  check (octet_length(bundle::text) < 2097152)
);

-- ─── Función ──────────────────────────────────────────────────────────────────
-- Publishes a bundle: checks the language and the expected version, appends the
-- history row and replaces the current one, in one transaction.
--   p_expected_version: the version the caller last saw; 0 = «none yet»;
--   null = publish anyway. Mismatch → 40001. Wrong language → 22023.
-- Not security definer: it runs with the caller's grants, and only
-- service_role may call it.

create function public.publish_language_bundle(
  p_slug text,
  p_bundle jsonb,
  p_expected_version integer,
  p_note text
) returns integer
language plpgsql
set search_path = ''
as $$
declare
  current_version integer;
  next_version integer;
begin
  if p_bundle ->> 'language' is distinct from p_slug then
    raise exception 'bundle language % does not match %',
      p_bundle ->> 'language', p_slug
      using errcode = '22023';
  end if;

  select bundles.version into current_version
  from public.language_bundles as bundles
  where bundles.slug = p_slug
  for update;

  if p_expected_version is not null
    and coalesce(current_version, 0) <> p_expected_version then
    raise exception 'expected version %, found %',
      p_expected_version, coalesce(current_version, 0)
      using errcode = '40001';
  end if;

  next_version := coalesce(current_version, 0) + 1;

  insert into public.bundle_versions (slug, version, bundle, note)
  values (p_slug, next_version, p_bundle, p_note);

  insert into public.language_bundles (slug, version, bundle, note, published_at)
  values (p_slug, next_version, p_bundle, p_note, now())
  on conflict (slug) do update
    set version = excluded.version,
        bundle = excluded.bundle,
        note = excluded.note,
        published_at = excluded.published_at;

  return next_version;
end;
$$;

-- ─── Permisos ─────────────────────────────────────────────────────────────────
-- RLS on with no policies: denies everything to anon and authenticated.
-- Revoke everything first, then open only what the server needs. The function
-- runs with the caller's grants, so service_role needs insert/update to publish
-- (lesson from Saltapalabras F0). The history never gets update or delete.

alter table public.language_bundles enable row level security;
alter table public.bundle_versions enable row level security;

revoke all on table public.language_bundles, public.bundle_versions
  from anon, authenticated, service_role;
grant select, insert, update on table public.language_bundles to service_role;
grant select, insert on table public.bundle_versions to service_role;

revoke all on function public.publish_language_bundle(text, jsonb, integer, text)
  from public, anon, authenticated;
grant execute on function public.publish_language_bundle(text, jsonb, integer, text)
  to service_role;
