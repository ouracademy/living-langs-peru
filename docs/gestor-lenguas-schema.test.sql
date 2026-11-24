-- Assertions for docs/gestor-lenguas-schema.sql (spec gestor-lenguas §6.1, AC-L2-1).
-- Runs on a scratch Postgres that already has the schema and the roles anon,
-- authenticated and service_role (see docs/saltapalabras-pruebas.md for the
-- local recipe). Everything happens inside a transaction that is rolled back.
-- Fixtures use words marked PRUEBA, never real language.

\set ON_ERROR_STOP on
begin;

create function pg_temp.bundle(slug text, word text) returns jsonb
language sql as $$
  select jsonb_build_object(
    'schema', 'language-bundle/1',
    'language', slug,
    'entries', jsonb_build_array(jsonb_build_object(
      'id', 'prueba-uno', 'word', word, 'verified', true)),
    'themes', jsonb_build_array()
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

-- anon and authenticated cannot read, write or publish anything.
do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    perform pg_temp.expect_error(r, 'select * from public.language_bundles', '42501');
    perform pg_temp.expect_error(r, 'select * from public.bundle_versions', '42501');
    perform pg_temp.expect_error(r,
      $q$insert into public.language_bundles (slug, version, bundle, note)
         values ('uro', 1, pg_temp.bundle('uro', 'PRUEBA uno'), 'x')$q$, '42501');
    perform pg_temp.expect_error(r,
      $q$select public.publish_language_bundle('uro', pg_temp.bundle('uro', 'PRUEBA uno'), 0, 'x')$q$, '42501');
  end loop;
end;
$$;

-- AC-L2-1 · v1, then v2 with expected = 1, each with a history row.
set local role service_role;
do $$
declare
  v integer;
begin
  v := public.publish_language_bundle('uro', pg_temp.bundle('uro', 'PRUEBA uno'), 0, 'primera');
  assert v = 1, format('first publish returned %s', v);
  v := public.publish_language_bundle('uro', pg_temp.bundle('uro', 'PRUEBA dos'), 1, 'segunda');
  assert v = 2, format('second publish returned %s', v);
  assert (select count(*) from public.bundle_versions where slug = 'uro') = 2;
  assert (select bundle -> 'entries' -> 0 ->> 'word' from public.language_bundles where slug = 'uro') = 'PRUEBA dos';
end;
$$;
reset role;

-- AC-L2-1 · an old expected version → 40001, nothing changes.
do $$
begin
  perform pg_temp.expect_error('service_role',
    $q$select public.publish_language_bundle('uro', pg_temp.bundle('uro', 'PRUEBA tres'), 1, 'vieja')$q$, '40001');
  assert (select version from public.language_bundles where slug = 'uro') = 2;
end;
$$;

-- A bundle of another language → 22023; a third language → 23514.
do $$
begin
  perform pg_temp.expect_error('service_role',
    $q$select public.publish_language_bundle('uro', pg_temp.bundle('ashaninka', 'PRUEBA'), null, 'x')$q$, '22023');
  perform pg_temp.expect_error('service_role',
    $q$select public.publish_language_bundle('aimara', pg_temp.bundle('aimara', 'PRUEBA'), null, 'x')$q$, '23514');
end;
$$;

-- 2 MB or more is rejected by the database itself.
do $$
begin
  perform pg_temp.expect_error('service_role',
    $q$select public.publish_language_bundle('uro',
         pg_temp.bundle('uro', 'PRUEBA ' || repeat('x', 2100000)), null, 'grande')$q$, '23514');
end;
$$;

-- History is immutable, even for service_role.
do $$
begin
  perform pg_temp.expect_error('service_role', 'update public.bundle_versions set note = note', '42501');
  perform pg_temp.expect_error('service_role', 'delete from public.bundle_versions', '42501');
end;
$$;

-- Restoring is publishing an old version again: it becomes a new one.
set local role service_role;
do $$
begin
  assert public.publish_language_bundle('uro',
    (select bundle from public.bundle_versions where slug = 'uro' and version = 1), 2, 'restaurar v1') = 3;
end;
$$;
reset role;

\echo 'gestor-lenguas-schema.test.sql: todas las aserciones pasan'
rollback;
