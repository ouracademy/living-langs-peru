-- Assertions for docs/edicion-fotos-schema.sql. AC-E3-5 and AC-E3-11.
-- Runs on a scratch Postgres that already has the schema and the roles
-- anon, authenticated and service_role (see docs/saltapalabras-pruebas.md for
-- the local setup). Everything happens inside a transaction that is rolled
-- back: it leaves no data behind.

\set ON_ERROR_STOP on
begin;

create function pg_temp.photos(how_many integer) returns jsonb
language sql as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'src', '/peoples/ashaninka/prueba-' || n || '.jpg',
    'width', 640, 'height', 480,
    'alt', 'Foto de PRUEBA número ' || n,
    'credit', jsonb_build_object('author', 'PRUEBA', 'license', 'PRUEBA')
  )), '[]'::jsonb)
  from generate_series(1, how_many) as n
$$;

-- Runs `statement` as `role` and asserts it fails with `expected` (an SQLSTATE).
create function pg_temp.expect_error(role text, statement text, expected text)
returns void language plpgsql as $$
begin
  execute format('set local role %I', role);
  begin
    execute statement;
  exception when others then
    reset role;
    if sqlstate <> expected then
      raise exception 'as %: expected % but got % (%) for: %',
        role, expected, sqlstate, sqlerrm, statement;
    end if;
    return;
  end;
  reset role;
  raise exception 'as %: expected % but it succeeded: %', role, expected, statement;
end;
$$;

-- AC-E3-11 · anon and authenticated cannot read, write or save.
do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    perform pg_temp.expect_error(r, 'select * from public.galleries', '42501');
    perform pg_temp.expect_error(r,
      $q$insert into public.galleries (slug, version, photos) values ('ashaninka', 1, '[]')$q$,
      '42501');
    perform pg_temp.expect_error(r, 'update public.galleries set version = version', '42501');
    perform pg_temp.expect_error(r,
      $q$select public.save_gallery('ashaninka', '[]', 0)$q$, '42501');
  end loop;
end;
$$;

-- service_role saves: first save creates version 1, the next one version 2.
set local role service_role;
do $$
declare
  saved integer;
begin
  saved := public.save_gallery('ashaninka', pg_temp.photos(5), 0);
  if saved <> 1 then raise exception 'first save: expected 1, got %', saved; end if;

  saved := public.save_gallery('ashaninka', pg_temp.photos(6), 1);
  if saved <> 2 then raise exception 'second save: expected 2, got %', saved; end if;

  if (select jsonb_array_length(photos) from public.galleries where slug = 'ashaninka') <> 6 then
    raise exception 'the row does not hold the last list';
  end if;
end;
$$;
reset role;

-- AC-E3-5 · a stale version is a conflict and changes nothing; so is a second
-- «first» save, and the limits hold even for service_role.
do $$
begin
  perform pg_temp.expect_error('service_role',
    $q$select public.save_gallery('ashaninka', pg_temp.photos(1), 1)$q$, '40001');
  perform pg_temp.expect_error('service_role',
    $q$select public.save_gallery('ashaninka', pg_temp.photos(1), 0)$q$, '40001');
  perform pg_temp.expect_error('service_role',
    $q$select public.save_gallery('ashaninka', pg_temp.photos(25), 2)$q$, '22023');
  perform pg_temp.expect_error('service_role',
    $q$select public.save_gallery('ashaninka', '{}'::jsonb, 2)$q$, '22023');
  perform pg_temp.expect_error('service_role',
    $q$select public.save_gallery('ashaninka', '[]'::jsonb, null)$q$, '22023');
  perform pg_temp.expect_error('service_role', 'delete from public.galleries', '42501');

  if (select version from public.galleries where slug = 'ashaninka') <> 2 then
    raise exception 'a refused save changed the version';
  end if;
end;
$$;

rollback;
\echo 'edicion-fotos-schema.test.sql: todas las aserciones pasan'
