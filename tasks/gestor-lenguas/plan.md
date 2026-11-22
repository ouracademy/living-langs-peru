# Plan de implementación — Gestor de contenido de lenguas

> Spec: [specs/gestor-lenguas.md](../../specs/gestor-lenguas.md) · Fecha: 2026-11-21 · Rama:
> `feat/gestor-lenguas` (desde `integracion`) · Lista de tareas: [todo.md](./todo.md)
> El spec sigue en `borrador`; el plan se escribe a pedido de la persona del proyecto.

---

## 1. Cómo se corta el trabajo

Cuatro fases verticales, cada una termina con algo que se ve en el sitio:

```
F1 el asháninka se sirve desde su paquete (Supabase → caché → respaldo del repo), igual que hoy;
   el uro dice «Todavía no hay contenido publicado para esta lengua»          (L1 + L2 + L3)
        │
        ▼
F2 /admin/lenguas: subir el JSON del uro, probar y publicar → aparece en el sitio          (L4)
        │
        ▼
F3 editar palabras, alfabeto, fuentes y temas desde la interfaz                            (L4)
        │
        ▼
F4 retirar lo duplicado: collation.ts como fuente, src/data/dictionary/*, /admin/juego     (L5)
```

## 2. Decisiones de implementación

1. **Adaptadores, no reescritura.** El paquete de lengua se traduce a las formas que ya consumen el
   diccionario (`Dictionary`, `Source`) y Saltapalabras (`LanguagePack`, vía `PackReadResult`). Así el
   motor del juego, `resolveGameState`, los componentes del diccionario y `buildItems` de
   «completar palabras» no cambian; solo cambia de dónde sale el contenido
   (`src/lib/language-bundles/adapters.ts`).
2. **El alfabeto viaja con el contenido.** Las funciones de orden (`getComparator`, `tokenizeWord`,
   `getInitial`, `groupByLetter`, `searchEntries`) aceptan el alfabeto como dato
   (`readonly string[]`) además del slug de antes; las páginas pasan el del paquete. El slug sigue
   funcionando para no romper los tests y `pack:draft` hasta F4.
3. **Lectura en tres niveles** (spec #5, #6): Supabase cacheado por `language:<slug>`
   (`unstable_cache`, 1 h de red) → si no hay fila o no hay configuración, el respaldo del repo
   (`src/data/bundles/<slug>.json`). Un error de lectura **lanza en producción** (Next sigue
   sirviendo la última página buena) y **cae al respaldo en el build y en dev** (mismo criterio que
   la galería de fotos), para que el build nunca dependa de Supabase.
4. **Saltapalabras durante la transición.** Mientras exista `/admin/juego`, el juego toma, en orden:
   el paquete de lengua publicado en Supabase → el paquete de `language_packs` publicado → el
   respaldo del repo. Así lo que hoy se publica en `/admin/juego` sigue viéndose hasta F4.
5. **Solo lo verificado.** Los adaptadores filtran `verified: false` antes de que nada llegue a una
   página o a la API (spec #8).
6. **Las dos lenguas se prerenderizan** (`generateStaticParams` con `languages`) en las tres rutas,
   con `revalidate = 3600`. Saltapalabras deja `[]`: ya no hace falta, porque el build no depende de
   Supabase (decisión 3).
7. **El uro deja de ser una excepción escrita en código.** `LANGUAGES_WITHOUT_PACK` y los textos
   fijos sobre el uro se retiran; una lengua sin paquete muestra el mismo mensaje que cualquier otra
   (spec #7, #11).

## 3. Duplicaciones que quedan hasta F4

| Qué                   | Dónde sigue                                                                                                                               | Se retira en |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Alfabeto asháninka    | `src/lib/dictionary/collation.ts` (constante)                                                                                             | F4           |
| Diccionario asháninka | `src/data/dictionary/ashaninka.json` + `sources.json` (los lee `dictionary:check`, `game:check`, `pack:draft` y el script de exportación) | F4           |
| Paquete del juego     | `language_packs` / `/admin/juego`                                                                                                         | F4           |
| Lista de emojis       | `src/data/word-jump/ashaninka-pictures.json`                                                                                              | F4           |

Mientras dure, `src/data/bundles/ashaninka.json` se regenera con
`node --experimental-strip-types scripts/export-ashaninka-bundle.ts` si cambia el diccionario.

## 4. Riesgos

| Riesgo                                                   | Mitigación                                                                                                                                                   |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| El sitio cambia sin querer al pasar al paquete (AC-L3-1) | Los e2e del diccionario y de los juegos corren sin cambios contra el respaldo; test que compara el diccionario de antes con el adaptado entrada por entrada. |
| El zod y el JSON Schema divergen                         | Un test valida el ejemplo, la plantilla y casos inválidos con los dos (ajv solo en el test, por ruta, sin dependencia nueva).                                |
| El build falla si Supabase no tiene la tabla todavía     | Decisión 3: en el build, cualquier error cae al respaldo.                                                                                                    |
| Publicar en `/admin/juego` deja de verse                 | Decisión 4.                                                                                                                                                  |
| Supabase gratis pausado                                  | Caché + respaldo; publicar falla hasta reactivar.                                                                                                            |

## 5. Checkpoints

- **Fin de F1:** `pnpm check:task` y e2e completos pasan; `next build` lista `/diccionario/[lengua]`,
  `/juegos/saltapalabras/[lengua]` y `/juegos/completar-palabras/[lengua]` con sus dos lenguas
  prerenderizadas; el uro muestra el mensaje de «sin contenido».
- **Fin de F2:** subir la plantilla del uro con una palabra «PRUEBA» verificada (contra el Supabase
  falso) la hace aparecer en `/diccionario/uro` y en su juego.
- **Fin de F3 y F4:** según los AC de la spec.

## 6. Resultado de F1 (2026-11-21)

- **L1:** `src/lib/language-bundles/{types,schema,validate}.ts`. `parseBundle` acepta y rechaza lo
  mismo que el JSON Schema: un test valida con los dos el ejemplo, la plantilla y 12 documentos
  inválidos (ajv cargado por ruta, solo en el test). `validateBundle` cubre los errores y avisos de
  spec §4.2.
- **L2:** `docs/gestor-lenguas-schema.sql` y su test, que pasa en un Postgres 18 local de usar y
  tirar. `library.ts` lee cacheado por `language:<slug>` con respaldo del repo.
- **L3:** diccionario, su API y los dos juegos leen del paquete. `next build` prerenderiza las dos
  lenguas en las tres rutas (`●`, revalidación 1 h), también sin variables de Supabase.
- **AC-L3-1:** un test compara entrada por entrada el diccionario que sale del paquete con el de
  `src/data/dictionary/ashaninka.json` y sus fuentes; los e2e del diccionario y de los dos juegos
  pasan sin cambios salvo los textos del uro.

**Desvíos**

1. **La API ordena por el alfabeto.** `/api/diccionario/[lengua]` ordenaba con la intercalación del
   castellano mientras la página ya usaba el alfabeto asháninka. La spec (§6.2, #10) pide el
   alfabeto del paquete para los dos; el test de la API se actualizó y lo documenta.
2. **AC-L1-1 lo cumplen `parseBundle` y `validateBundle` juntos.** El JSON Schema no puede expresar
   referencias cruzadas; «un tema que apunta a una entrada inexistente» y «una fuente que no
   existe» son errores de `validateBundle`, no de `parseBundle`, que sigue espejando el esquema.
3. **`Source` del diccionario tiene `publisher`, `year` y `url` opcionales**, porque una fuente del
   paquete puede ser una persona hablante. Las citas se muestran sin comas sueltas
   (`SourceCitation`, `sourceImprint`).
4. **La excepción del uro sale solo de las páginas públicas.** `src/lib/word-jump/availability.ts`
   sigue para `/admin/juego` y su ruta de publicación, que se retiran en F4.
5. **«Versión 0»** no se muestra en Saltapalabras cuando el contenido viene del respaldo del repo.

## 7. Resultado de F2 (2026-11-22)

Hecho en `feat/gestor-lenguas`: `/admin/lenguas` y `/admin/lenguas/[lengua]` para subir un JSON,
ver errores y avisos, «Probar» (diccionario y Saltapalabras con la copia de trabajo), publicar con
nota y versión esperada, ver el historial, descargar y restaurar. No hace falta SQL nuevo: usa
`publish_language_bundle` y las tablas de F1.

**Cómo se comprobó:** AC-L4-1 con `tests/e2e/bundle-publish.spec.ts` (sube el paquete de prueba del
uro, lo publica y espera ver sus palabras verificadas en `/diccionario/uro` y su tema en
`/juegos/saltapalabras/uro`; la palabra sin verificar no aparece). AC-L4-2 con
`tests/unit/admin/bundle-admin.test.tsx` y `tests/e2e/bundle-admin.spec.ts` (resumen de nuevas,
cambiadas y que faltan; «Cancelar» no cambia nada; «Reemplazar» sí).

**Desvíos:**

1. **La prueba que publica corre en otro proyecto de Playwright** (`chromium-publish`, con
   `dependencies: ["chromium"]`). Publicar el uro cambia lo que muestran sus páginas, y otros specs
   comprueban que el uro no tiene contenido: así nunca corren a la vez.
2. **El resumen de diferencias se compara contra la copia de trabajo, o contra lo publicado si no
   hay copia.** Si no hay ninguna de las dos, el archivo se carga directo (no hay nada que pisar).
3. **«Trabajar sobre lo publicado»** copia lo publicado a la copia de trabajo (equivale a «Editar el
   paquete publicado» de `/admin/juego`).
4. **Componentes duplicados de `/admin/juego`** (`draft-store`, formulario de publicar, historial,
   API del navegador) en versión para paquetes de lengua: `/admin/juego` se retira en F4 y con él la
   copia vieja. Estilos, formato de fechas y `downloadText` se importan de `pack-admin/`.
5. **«Descargar plantilla»** genera en el navegador lo mismo que
   `docs/gestor-lenguas/plantilla-uro.json` (un test lo compara), con la lengua de la página.
