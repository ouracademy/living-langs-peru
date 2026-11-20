-- Edición de fotos: galería en Supabase (tabla, función, permisos y bucket).
-- Spec: specs/edicion-fotos.md §2 #2, #3, #11, #19 · Plan: tasks/edicion-fotos/plan.md §8
-- Se pega en el SQL Editor de Supabase; el código no lo ejecuta.
-- Tests: docs/edicion-fotos-schema.test.sql (cómo correrlo: docs/saltapalabras-pruebas.md, mismo
-- Postgres local con los roles de la API simulados).
--
-- Corrido en Supabase el: (pendiente, H5)

-- ─── Tabla ────────────────────────────────────────────────────────────────────
-- One row per gallery: `photos` is the list exactly as `photos` in
-- src/data/peoples/ashaninka.json, validated by the server (validatePeople)
-- before every save. A whole list per row keeps add, edit, move and remove a
-- single write, with nothing to renumber (plan §8, decision 1).

create table public.galleries (
  slug       text        primary key check (slug ~ '^[a-z0-9-]{2,30}$'),
  version    integer     not null check (version >= 1),
  photos     jsonb       not null check (jsonb_typeof(photos) = 'array'),
  updated_at timestamptz not null default now(),
  check (jsonb_array_length(photos) <= 24),
  check (octet_length(photos::text) < 262144)
);

-- ─── Función ──────────────────────────────────────────────────────────────────
-- Saves a gallery's whole list if nobody saved since `p_expected_version`
-- (0 = «no row yet»), and returns the new version, in one transaction.
--   Mismatch → 40001. Not an array, more than 24 photos or no version → 22023.
-- Not security definer: it runs with the caller's grants, and only
-- service_role may call it (same as publish_language_pack).

create function public.save_gallery(
  p_slug text,
  p_photos jsonb,
  p_expected_version integer
) returns integer
language plpgsql
set search_path = ''
as $$
declare
  current_version integer;
begin
  if p_expected_version is null or p_expected_version < 0 then
    raise exception 'expected version is required' using errcode = '22023';
  end if;
  if jsonb_typeof(p_photos) is distinct from 'array' then
    raise exception 'photos must be an array' using errcode = '22023';
  end if;
  if jsonb_array_length(p_photos) > 24 then
    raise exception 'a gallery holds at most 24 photos' using errcode = '22023';
  end if;

  select galleries.version into current_version
  from public.galleries as galleries
  where galleries.slug = p_slug
  for update;

  if coalesce(current_version, 0) <> p_expected_version then
    raise exception 'expected version %, found %',
      p_expected_version, coalesce(current_version, 0)
      using errcode = '40001';
  end if;

  if current_version is null then
    begin
      -- Two first saves at once: the second hits the primary key, and that is
      -- a conflict too, not an overwrite.
      insert into public.galleries (slug, version, photos)
      values (p_slug, 1, p_photos);
    exception when unique_violation then
      raise exception 'expected version 0, found a newer gallery'
        using errcode = '40001';
    end;
    return 1;
  end if;

  update public.galleries
  set version = current_version + 1,
      photos = p_photos,
      updated_at = now()
  where slug = p_slug;

  return current_version + 1;
end;
$$;

-- ─── Permisos ─────────────────────────────────────────────────────────────────
-- RLS on with no policies: denies everything to anon and authenticated.
-- Revoke everything first, then open only what the server needs. The
-- function runs with the caller's grants, so service_role needs
-- insert/update (lesson from the game's F0).

alter table public.galleries enable row level security;

revoke all on table public.galleries from anon, authenticated, service_role;
grant select, insert, update on table public.galleries to service_role;

revoke all on function public.save_gallery(text, jsonb, integer)
  from public, anon, authenticated;
grant execute on function public.save_gallery(text, jsonb, integer)
  to service_role;

-- ─── Bucket ───────────────────────────────────────────────────────────────────
-- Public to read (next/image fetches it from Vercel; visitors never call
-- Supabase). No write policies on storage.objects: only the server, with the
-- secret key, uploads and deletes. JPEG only, 3 MB (spec §6.3).
-- Skipped on a plain Postgres without the storage schema (the local tests).

do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('gallery', 'gallery', true, 3145728, array['image/jpeg'])
    on conflict (id) do update
      set public = true,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;
  end if;
end;
$$;
