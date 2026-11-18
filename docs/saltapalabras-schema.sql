-- Saltapalabras: tablas, vista y función de publicación.
-- Spec: specs/saltapalabras.md §6 · Plan: tasks/saltapalabras/plan.md §3.4
-- Se pega en el SQL Editor de Supabase; el código no lo ejecuta. Un bloque por capacidad.
-- Tests: docs/saltapalabras-schema.test.sql (cómo correrlo: docs/saltapalabras-pruebas.md).
--
-- Bloque SP3 corrido en Supabase el: (pendiente, H1)

-- ─── SP3 · pack-library ────────────────────────────────────────────────────────

create table public.language_packs (
  language     text        primary key check (language ~ '^[a-z0-9-]{2,30}$'),
  version      integer     not null check (version >= 1),
  pack         jsonb       not null,
  note         text        not null check (char_length(btrim(note)) between 1 and 500),
  published_at timestamptz not null default now(),
  check (pack -> 'language' ->> 'slug' = language),
  check (jsonb_typeof(pack -> 'themes') = 'array'),
  -- Serialized size, the same thing the server checks (spec §4.3). pg_column_size
  -- would measure the compressed value and let a larger pack through.
  check (octet_length(pack::text) < 2097152)
);

create table public.pack_versions (
  language     text        not null check (language ~ '^[a-z0-9-]{2,30}$'),
  version      integer     not null check (version >= 1),
  pack         jsonb       not null,
  note         text        not null check (char_length(btrim(note)) between 1 and 500),
  published_at timestamptz not null default now(),
  primary key (language, version),
  check (pack -> 'language' ->> 'slug' = language),
  check (jsonb_typeof(pack -> 'themes') = 'array'),
  check (octet_length(pack::text) < 2097152)
);

-- One row per published item, to answer «how much is left to verify» and
-- «how much audio is there» from the Supabase dashboard.
create view public.pack_words
with (security_invoker = true) as
select
  packs.language,
  theme ->> 'id' as theme_id,
  item ->> 'id' as item_id,
  item ->> 'word' as word,
  coalesce((item ->> 'verified')::boolean, false) as verified,
  coalesce(item ->> 'audio', '') <> '' as has_audio
from public.language_packs as packs,
  jsonb_array_elements(packs.pack -> 'themes') as theme,
  jsonb_array_elements(theme -> 'items') as item;

-- Publishes a pack: checks the language and the expected version, appends the
-- history row and replaces the current version, in one transaction.
--   p_expected_version: the version the caller last saw; 0 = «none published yet»;
--   null = publish anyway. Mismatch → 40001. Wrong language → 22023.
-- Not security definer: it runs with the caller's grants, and only service_role
-- may call it.
create function public.publish_language_pack(
  p_language text,
  p_pack jsonb,
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
  if p_pack -> 'language' ->> 'slug' is distinct from p_language then
    raise exception 'pack language % does not match %',
      p_pack -> 'language' ->> 'slug', p_language
      using errcode = '22023';
  end if;

  select packs.version into current_version
  from public.language_packs as packs
  where packs.language = p_language
  for update;

  if p_expected_version is not null
    and coalesce(current_version, 0) <> p_expected_version then
    raise exception 'expected version %, found %',
      p_expected_version, coalesce(current_version, 0)
      using errcode = '40001';
  end if;

  next_version := coalesce(current_version, 0) + 1;

  insert into public.pack_versions (language, version, pack, note)
  values (p_language, next_version, p_pack, p_note);

  insert into public.language_packs (language, version, pack, note, published_at)
  values (p_language, next_version, p_pack, p_note, now())
  on conflict (language) do update
    set version = excluded.version,
        pack = excluded.pack,
        note = excluded.note,
        published_at = excluded.published_at;

  return next_version;
end;
$$;

-- Permissions. RLS on with no policies: denies everything to anon and
-- authenticated. Grants: revoke everything first, then open only what the
-- server needs. service_role ignores RLS but not grants, and the function runs
-- with the caller's grants, so service_role needs insert/update to publish
-- (plan §3.4). pack_versions never gets update or delete: history is immutable.
alter table public.language_packs enable row level security;
alter table public.pack_versions enable row level security;

revoke all on table public.language_packs, public.pack_versions, public.pack_words
  from anon, authenticated, service_role;
grant select, insert, update on table public.language_packs to service_role;
grant select, insert on table public.pack_versions to service_role;
grant select on table public.pack_words to service_role;

revoke all on function public.publish_language_pack(text, jsonb, integer, text)
  from public, anon, authenticated;
grant execute on function public.publish_language_pack(text, jsonb, integer, text)
  to service_role;

-- First pack (F1, before /admin/juego exists), from the SQL Editor — only a
-- pack verified by a speaker or the cited source (spec §13, H3):
--   select public.publish_language_pack('ashaninka', '<pack json>'::jsonb, 0, 'Primer paquete, verificado por …');
