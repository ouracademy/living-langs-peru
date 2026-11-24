-- Migración de Saltapalabras a los paquetes de lengua (spec gestor-lenguas, F4).
--
-- Desde F4 el sitio no lee `language_packs` ni `pack_versions`: Saltapalabras
-- sale de `language_bundles` (o del paquete del repo). Este archivo copia lo que
-- se publicó en /admin/juego al formato nuevo y deja las tablas viejas en solo
-- lectura. Borrarlas es una tarea aparte (H3 en tasks/gestor-lenguas/todo.md).
--
-- Requisitos: docs/saltapalabras-schema.sql y docs/gestor-lenguas-schema.sql
-- ya corridos, y el código de F4 desplegado (nada escribe ya las tablas viejas).
--
-- Por qué la copia no es un INSERT directo: una fila de `language_bundles` que
-- no pasa `parseBundle` hace fallar la página en producción (library.ts). Así
-- que el SQL solo convierte; el JSON entra por «Subir JSON» en /admin/lenguas,
-- que valida, muestra las diferencias con lo publicado y publica con
-- `publish_language_bundle` (que escribe `language_bundles` y
-- `bundle_versions`, con su nota). Nada se publica sin que alguien lo mire.
--
-- Pasos, en el SQL editor de Supabase (cada paso es una ejecución completa):
--   1. Correr el bloque 1 + el bloque 2. Por cada lengua sale un JSON.
--   2. Correr el bloque 1 + el bloque 3: lo que la conversión no puede llevar.
--   3. Guardar cada JSON como <lengua>.json, subirlo en /admin/lenguas/<lengua>,
--      corregir lo que marque el validador, probar y publicar con una nota como
--      «Copiado de language_packs, versión N».
--   4. Correr el bloque 4: las tablas viejas quedan en solo lectura.
--
-- El historial (`pack_versions`) no se copia a `bundle_versions`: tiene otro
-- formato y otra numeración, y el historial de un paquete de lengua empieza en
-- su primera publicación. Queda legible, sin cambios, hasta que se borre (H3);
-- si se quiere conservar, exportarlo antes (Table editor → Export to CSV).

-- ---------------------------------------------------------------------------
-- Bloque 1. Conversión language-pack/1 → language-bundle/1.
-- pg_temp: vive solo en esta sesión, no deja objetos en la base.
-- ---------------------------------------------------------------------------
create or replace function pg_temp.pack_to_bundle(pack jsonb)
returns jsonb
language sql
immutable
as $$
  with items as (
    -- Cada palabra una sola vez, aunque esté en varios temas: gana la primera,
    -- en el orden de los temas (el bloque 3 lista las que difieren).
    select distinct on (item ->> 'id')
      item, theme_order * 100000 + item_order as position
    from jsonb_array_elements(pack -> 'themes') with ordinality as t(theme, theme_order),
         jsonb_array_elements(theme -> 'items') with ordinality as i(item, item_order)
    order by item ->> 'id', theme_order, item_order
  )
  select jsonb_strip_nulls(jsonb_build_object(
    'schema', 'language-bundle/1',
    'language', pack -> 'language' ->> 'slug',
    'translationLabel', pack -> 'language' ->> 'translationLabel',
    'alphabet', jsonb_build_object(
      'graphemes', pack -> 'language' -> 'graphemes',
      'vowels', pack -> 'language' -> 'vowels',
      'vowelVariants', pack -> 'language' -> 'vowelVariants',
      'confusable', pack -> 'language' -> 'confusable'
    ),
    'speech', pack -> 'language' -> 'tts',
    'sources', (
      select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', source ->> 'id',
        'kind', source ->> 'kind',
        'title', source ->> 'title',
        'url', source ->> 'url',
        'note', source ->> 'note'
      )) order by n), '[]'::jsonb)
      from jsonb_array_elements(pack -> 'sources') with ordinality as s(source, n)
    ),
    'entries', (
      select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', item ->> 'id',
        'word', item ->> 'word',
        'translations', jsonb_build_array(item ->> 'translation'),
        'emoji', item ->> 'emoji',
        'audio', item ->> 'audio',
        -- Sin fuente queda "" y el validador la marca al subir: no se inventa.
        'sourceId', coalesce(item ->> 'sourceId', ''),
        'sourceRef', item ->> 'sourceRef',
        'verified', coalesce((item ->> 'verified')::boolean, false)
      )) order by position), '[]'::jsonb)
      from items
    ),
    'themes', (
      -- Un tema vacío no es válido en un paquete de lengua: se deja fuera.
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', theme ->> 'id',
        'name', theme ->> 'name',
        'icon', theme ->> 'icon',
        'mode', theme ->> 'mode',
        'entryIds', (
          select jsonb_agg(distinct_id order by first_seen)
          from (
            select item ->> 'id' as distinct_id, min(n) as first_seen
            from jsonb_array_elements(theme -> 'items') with ordinality as i(item, n)
            group by item ->> 'id'
          ) as ids
        )
      ) order by theme_order), '[]'::jsonb)
      from jsonb_array_elements(pack -> 'themes') with ordinality as t(theme, theme_order)
      where jsonb_array_length(theme -> 'items') > 0
    )
  ))
$$;

-- ---------------------------------------------------------------------------
-- Bloque 2. El JSON de cada lengua, listo para guardar y subir.
-- ---------------------------------------------------------------------------
select language,
       version as pack_version,
       jsonb_pretty(pg_temp.pack_to_bundle(pack)) as bundle_json
from public.language_packs
order by language;

-- ---------------------------------------------------------------------------
-- Bloque 3. Lo que el formato nuevo no guarda o la conversión no decide sola.
-- Vacío = nada que revisar a mano.
-- ---------------------------------------------------------------------------
select language, 'tema sin palabras: no se copia' as aviso, theme ->> 'id' as detalle
from public.language_packs, jsonb_array_elements(pack -> 'themes') as theme
where jsonb_array_length(theme -> 'items') = 0
union all
select language, 'nombre del tema en la lengua (nameNative): no se copia', theme ->> 'nameNative'
from public.language_packs, jsonb_array_elements(pack -> 'themes') as theme
where theme ? 'nameNative'
union all
select language, 'palabra sin fuente: completarla antes de publicar', item ->> 'id'
from public.language_packs,
     jsonb_array_elements(pack -> 'themes') as theme,
     jsonb_array_elements(theme -> 'items') as item
where coalesce(item ->> 'sourceId', '') = ''
union all
select language, 'mismo id con datos distintos en dos temas: se copió el primero', item_id
from (
  select language, item ->> 'id' as item_id, count(distinct item) as variants
  from public.language_packs,
       jsonb_array_elements(pack -> 'themes') as theme,
       jsonb_array_elements(theme -> 'items') as item
  group by language, item ->> 'id'
) as repeated
where variants > 1
union all
select language, 'praise / about: el paquete de lengua no los tiene', key
from public.language_packs, jsonb_object_keys(pack -> 'language') as key
where key in ('praise', 'about')
order by 1, 2, 3;

-- ---------------------------------------------------------------------------
-- Bloque 4. Solo lectura: después de publicar lo copiado en /admin/lenguas.
-- service_role conserva select, así que el historial se sigue pudiendo leer y
-- exportar hasta que se borren las tablas (H3).
-- ---------------------------------------------------------------------------
revoke insert, update, delete, truncate on table public.language_packs, public.pack_versions
  from service_role;
revoke execute on function public.publish_language_pack(text, jsonb, integer, text)
  from service_role;
