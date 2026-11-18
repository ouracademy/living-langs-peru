-- Assertions for docs/saltapalabras-schema.sql (block SP3). AC-SP3-1 … AC-SP3-6.
-- Runs on a scratch Postgres that already has the schema and the roles
-- anon, authenticated and service_role (Supabase has them; for a local
-- Postgres, see docs/saltapalabras-pruebas.md). Everything happens inside a
-- transaction that is rolled back: it leaves no data behind.
-- Fixtures use words marked PRUEBA, never real language (spec §13).

\set ON_ERROR_STOP on
begin;

create function pg_temp.pack(slug text, word text) returns jsonb
language sql as $$
  select jsonb_build_object(
    'schema', 'language-pack/1',
    'language', jsonb_build_object('slug', slug),
    'themes', jsonb_build_array(jsonb_build_object(
      'id', 'tema-prueba', 'items', jsonb_build_array(jsonb_build_object(
        'id', 'item-1', 'word', word, 'verified', true))))
  )
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

-- AC-SP3-1 · anon and authenticated cannot read or write anything.
do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    perform pg_temp.expect_error(r, 'select * from public.language_packs', '42501');
    perform pg_temp.expect_error(r, 'select * from public.pack_versions', '42501');
    perform pg_temp.expect_error(r, 'select * from public.pack_words', '42501');
    perform pg_temp.expect_error(r,
      $q$insert into public.language_packs (language, version, pack, note)
         values ('ashaninka', 1, pg_temp.pack('ashaninka', 'PRUEBA uno'), 'x')$q$, '42501');
    perform pg_temp.expect_error(r, 'update public.language_packs set note = note', '42501');
    perform pg_temp.expect_error(r, 'delete from public.pack_versions', '42501');
  end loop;
end;
$$;

-- AC-SP3-2 · only service_role executes the function.
do $$
begin
  perform pg_temp.expect_error('anon',
    $q$select public.publish_language_pack('ashaninka', pg_temp.pack('ashaninka', 'PRUEBA uno'), 0, 'x')$q$, '42501');
  perform pg_temp.expect_error('authenticated',
    $q$select public.publish_language_pack('ashaninka', pg_temp.pack('ashaninka', 'PRUEBA uno'), 0, 'x')$q$, '42501');
end;
$$;

-- AC-SP3-3 · v1, then v2 with expected = 1, each with a history row.
set local role service_role;
do $$
declare
  v integer;
begin
  v := public.publish_language_pack('ashaninka', pg_temp.pack('ashaninka', 'PRUEBA uno'), 0, 'primera');
  assert v = 1, format('first publish returned %s', v);
  v := public.publish_language_pack('ashaninka', pg_temp.pack('ashaninka', 'PRUEBA dos'), 1, 'segunda');
  assert v = 2, format('second publish returned %s', v);
  assert (select count(*) from public.pack_versions where language = 'ashaninka') = 2;
  assert (select version from public.language_packs where language = 'ashaninka') = 2;
  assert (select word from public.pack_words where language = 'ashaninka') = 'PRUEBA dos';
end;
$$;
reset role;

-- AC-SP3-4 · expected = 1 while the current one is 2 → 40001, nothing changes.
do $$
begin
  perform pg_temp.expect_error('service_role',
    $q$select public.publish_language_pack('ashaninka', pg_temp.pack('ashaninka', 'PRUEBA tres'), 1, 'vieja')$q$, '40001');
  assert (select version from public.language_packs where language = 'ashaninka') = 2;
  assert (select count(*) from public.pack_versions where language = 'ashaninka') = 2;
end;
$$;

-- AC-SP3-5 · a pack for another language → 22023.
do $$
begin
  perform pg_temp.expect_error('service_role',
    $q$select public.publish_language_pack('ashaninka', pg_temp.pack('uro', 'PRUEBA uno'), null, 'x')$q$, '22023');
end;
$$;

-- AC-SP3-6 · a pack of 2 MB or more is rejected by the database itself.
do $$
begin
  perform pg_temp.expect_error('service_role',
    $q$select public.publish_language_pack('ashaninka',
         pg_temp.pack('ashaninka', 'PRUEBA ' || repeat('x', 2100000)), null, 'grande')$q$, '23514');
end;
$$;

-- History is immutable, even for service_role.
do $$
begin
  perform pg_temp.expect_error('service_role', 'update public.pack_versions set note = note', '42501');
  perform pg_temp.expect_error('service_role', 'delete from public.pack_versions', '42501');
end;
$$;

-- null expected = publish anyway.
set local role service_role;
do $$
begin
  assert public.publish_language_pack('ashaninka', pg_temp.pack('ashaninka', 'PRUEBA cuatro'), null, 'igual') = 3;
end;
$$;
reset role;

\echo 'saltapalabras-schema.test.sql: todas las aserciones pasan'
rollback;
