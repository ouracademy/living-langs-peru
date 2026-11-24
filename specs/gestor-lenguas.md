# Gestor de contenido de lenguas (diccionario y juegos de asháninka y uro, en JSON)

> Estado: **implementado** (F1-F4, 2026-11-23; quedan las tareas humanas H1-H4) · Fecha:
> 2026-11-21 (alcance acotado el mismo día) · Rama sugerida:
> `integracion` · Plan: [tasks/gestor-lenguas/](../tasks/gestor-lenguas/plan.md) · Índice:
> [specs/README.md](./README.md)
> Depende de: `/admin` con Basic Auth ([edicion-fotos.md](./edicion-fotos.md) E1) y de la lectura
> cacheada de Supabase de [saltapalabras.md](./saltapalabras.md) §6.4.
> **Modifica**: [diccionario.md](./diccionario.md), [saltapalabras.md](./saltapalabras.md) (el
> paquete del juego pasa a ser parte del paquete de lengua, y el uro deja de estar excluido) y
> [completar-palabras.md](./completar-palabras.md). Ver §9.

---

## 1. Objetivo

Que el contenido del **diccionario** y de los **juegos** de cada lengua se cargue como **un archivo
JSON** desde `/admin/lenguas`, se pueda **editar y ampliar desde la interfaz**, y se publique sin
tocar código. El sitio muestra lo publicado.

**El universo es fijo: dos lenguas, asháninka y uro** (decisión de la persona del proyecto,
2026-11-21). Sus rutas siguen en el código y siguen siendo estáticas; lo que cambia es de dónde sale
su contenido. Sumar una tercera lengua sí requiere código, y está fuera de alcance.

**Usuarios**

| Usuario                  | Necesidad                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------- |
| Editor del equipo        | Subir el vocabulario de una lengua, corregir o agregar palabras y temas de juego.     |
| Responsable de contenido | Saber de dónde sale cada palabra, quién la verificó y volver atrás si algo salió mal. |
| Visitante                | Ver solo contenido verificado, rápido, y que el sitio no se caiga si Supabase falla.  |

**Qué NO es este trabajo**

- No hay otras lenguas que asháninka y uro, ni pantalla para crear lenguas.
- Solo JSON: no hay importación desde CSV u hojas de cálculo.
- No cambia la página del pueblo (`/ashaninka`: historia, cifras, fotos) ni la portada.
- No genera ni traduce palabras, ni con IA ni de ninguna otra forma: el gestor **carga** contenido que
  el equipo trae de una fuente; nunca lo inventa (Saltapalabras §13).
- No hay cuentas, roles ni propuestas: el acceso es el Basic Auth de `/admin`.

---

## 2. Decisiones

| #   | Decisión                          | Elección                                                                                                                                                                                                                                                                                                                              |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Dos lenguas fijas**             | `ashaninka` y `uro`, en `src/lib/languages.ts` como hoy. Las rutas `/diccionario/[lengua]`, `/juegos/saltapalabras/[lengua]` y `/juegos/completar-palabras/[lengua]` generan sus dos páginas en el build (`generateStaticParams`) y se revalidan al publicar.                                                                         |
| 2   | **Una lengua = un JSON**          | Todo el contenido de diccionario y juegos de una lengua es **un documento** (`language-bundle/1`, §4): alfabeto, fuentes, entradas y temas. Es la unidad que se sube, valida, edita, publica, versiona y descarga.                                                                                                                    |
| 3   | **Las palabras viven una vez**    | Las **entradas** del diccionario son la única lista de palabras. Los temas de juego **referencian entradas por id**. Corregir una traducción o un emoji la corrige en el diccionario y en los dos juegos a la vez.                                                                                                                    |
| 4   | **Dónde se guarda**               | Supabase: `language_bundles` (versión publicada) y `bundle_versions` (historial inmutable), con `publish_language_bundle` y versión esperada. Generaliza `language_packs`/`pack_versions`, que se migran (§6.3).                                                                                                                      |
| 5   | **Quién lee**                     | Solo el servidor, con la clave secreta, cacheado por etiqueta `language:<slug>`. El navegador nunca habla con Supabase para datos. Publicar invalida con `revalidateTag(tag, "max")`, sin `revalidatePath` (hallazgo F0 de Saltapalabras).                                                                                            |
| 6   | **Si Supabase falla**             | Se sirve la última versión cacheada. En el build, o si nunca hubo lectura, se usa el **respaldo del repo** (`src/data/bundles/<slug>.json`): para el asháninka, su contenido actual; para el uro, ninguno. El sitio nunca pierde lo que ya mostraba.                                                                                  |
| 7   | **Lengua sin contenido**          | Si una lengua no tiene paquete publicado o no tiene entradas verificadas, su diccionario y sus juegos muestran «Todavía no hay contenido publicado para esta lengua». La página existe (decisión #1); no hay 404.                                                                                                                     |
| 8   | **Solo lo verificado se muestra** | Una entrada con `verified: false` no aparece en el diccionario público ni en los juegos. Marcar «verificada» es un acto del editor, con la fuente y quién verificó.                                                                                                                                                                   |
| 9   | **Fuente obligatoria**            | Toda entrada cita una fuente del paquete (`sourceId`). Sin fuente, no se publica (error).                                                                                                                                                                                                                                             |
| 10  | **El alfabeto viene en el JSON**  | Orden alfabético, agrupación por letra y los modos «letra inicial» y «vocal que falta» salen del alfabeto del paquete, no de `collation.ts`. Una palabra con letras fuera del alfabeto es un **aviso**.                                                                                                                               |
| 11  | **El uro, con contenido**         | Revierte la exclusión de Saltapalabras #5 (decisión del 2026-11-21). Como el uro no tiene alfabeto oficial ni hablantes (`docs/uro-language-sources.md`), su JSON trae **su propio alfabeto** y cada palabra **su fuente** (p. ej. léxico histórico); el equipo responde por esa elección. La fuente se muestra junto a cada palabra. |
| 12  | **Edición en el navegador**       | El admin edita una **copia de trabajo** en el navegador (con respaldo en `localStorage`), valida en vivo, «Probar» muestra diccionario y juego con esa copia, y se publica todo junto. Reusa el editor de palabras de SP6b.                                                                                                           |
| 13  | **Importar no pisa en silencio**  | Subir un JSON sobre una lengua con contenido muestra el resumen de diferencias (entradas nuevas, cambiadas y que faltan) y pide confirmar antes de reemplazar la copia de trabajo.                                                                                                                                                    |
| 14  | **Tamaño**                        | Un paquete pesa menos de 2 MB (unas 5.000 entradas). Más grande → error.                                                                                                                                                                                                                                                              |
| 15  | **Lengua del código**             | Claves del JSON y del código en inglés (`entries`, `translations`). URL y UI en español (`/admin/lenguas`).                                                                                                                                                                                                                           |

---

## 3. Mapa de capacidades

| Id  | Capacidad                                                                          | Depende de | Se verifica con                              |
| --- | ---------------------------------------------------------------------------------- | ---------- | -------------------------------------------- |
| L1  | Formato `language-bundle/1`: tipos, esquema, validación                            | —          | Vitest                                       |
| L2  | Almacenamiento, publicación, historial y lectura cacheada                          | L1         | SQL de prueba + Vitest con Supabase simulado |
| L3  | Diccionario y juegos leen del paquete (las dos rutas estáticas)                    | L2         | e2e con Supabase falso + build sin variables |
| L4  | `/admin/lenguas`: subir JSON, editar entradas, alfabeto, fuentes y temas, publicar | L2         | Tests de componente + e2e                    |
| L5  | Migración del asháninka y del paquete actual del juego                             | L3, L4     | Diff antes/después + e2e                     |

**Fases verticales:**

1. **F1 (L1 + L2 + L3):** el asháninka se sirve **desde su paquete** (respaldo del repo y Supabase) y
   el sitio se ve igual que hoy; el uro muestra «Todavía no hay contenido publicado».
2. **F2 (L4, subir y publicar):** subir un JSON de prueba para el uro, «Probar» y publicar lo hace
   aparecer en su diccionario y su juego.
3. **F3 (L4, editar):** editar una palabra, el alfabeto y un tema desde la interfaz, y publicar.
4. **F4 (L5):** se retiran el alfabeto fijo de `collation.ts`, `src/data/dictionary/*.json` como
   fuente y `/admin/juego` (sus funciones viven ahora en `/admin/lenguas`).

---

## 4. L1 — El formato `language-bundle/1`

### 4.1 Estructura

La referencia normativa es el **JSON Schema**
[`docs/gestor-lenguas/language-bundle.schema.json`](../docs/gestor-lenguas/language-bundle.schema.json)
(fijado el 2026-11-21); los tipos de abajo lo resumen. El esquema zod de L1 (`parseBundle`) tiene que
aceptar y rechazar exactamente lo mismo, con un test que lo compare contra el ejemplo y la plantilla.

```ts
type LanguageBundle = {
  $schema?: string; // ruta al JSON Schema, para validar en el editor; el sitio la ignora
  schema: "language-bundle/1";
  language: "ashaninka" | "uro"; // decisión #1
  translationLabel: string; // "castellano"
  alphabet: {
    graphemes: string[]; // en orden, dígrafos incluidos
    vowels: string[];
    vowelVariants?: Record<string, string>;
    confusable?: Record<string, string[]>;
    sourceId?: string; // la norma o la fuente que lo fija
  };
  speech?: {
    lang: string;
    quality: "approx" | "off";
    replace?: [string, string][];
  };
  sources: Source[]; // { id, kind: "publication" | "speaker", title, publisher?, year?, authors?, url?, license?, note? }
  entries: Entry[];
  themes: Theme[]; // temas de juego
};

type Entry = {
  id: string; // estable: sobrevive a corregir la escritura
  word: string;
  variants?: string[]; // otras escrituras, también buscables
  translations: string[]; // al menos una; la primera es la de los juegos
  partOfSpeech?:
    | "noun"
    | "verb"
    | "adjective"
    | "adverb"
    | "pronoun"
    | "interjection"
    | "phrase";
  examples?: { sentence: string; translation: string; sourceId?: string }[]; // alimentan «completar palabras»
  notes?: string;
  emoji?: string;
  audio?: string; // URL del bucket de audio
  sourceId: string;
  sourceRef?: string; // "p. 112"
  verified: boolean;
  verifiedBy?: string; // persona hablante o fuente
};

type Theme = {
  id: string;
  name: string;
  icon: string;
  mode: "pic2word" | "listen" | "word2pic" | "first" | "vowel";
  entryIds: string[]; // referencias, no copias (decisión #3)
};
```

### 4.2 Reglas de validación

**Errores** (bloquean publicar, no guardar la copia de trabajo): `schema` distinto; `language`
distinto de la lengua que se edita; entrada sin `word`, sin traducción o sin `sourceId` que
resuelva; ids repetidos; tema que referencia una entrada que no existe; alfabeto vacío; paquete ≥ 2
MB; `audio` fuera del bucket.

**Avisos**: palabra con letras fuera del alfabeto; entrada sin verificar; tema por debajo del mínimo
de su modo (Saltapalabras §4.3); entrada sin emoji en un tema de dibujos; misma palabra en dos
entradas.

### 4.3 Guía, ejemplo y plantilla (hechos el 2026-11-21)

- [`docs/gestor-lenguas/formato.md`](../docs/gestor-lenguas/formato.md): guía para quien prepara el
  contenido, campo por campo, con errores, avisos y reglas de contenido.
- [`src/data/bundles/ashaninka.json`](../src/data/bundles/ashaninka.json): el asháninka completo en
  este formato (169 entradas, 33 con emoji, 4 temas), generado por
  `scripts/export-ashaninka-bundle.ts` sin agregar ni quitar palabras. Valida contra el esquema y es
  el respaldo de la decisión #6.
- [`docs/gestor-lenguas/plantilla-uro.json`](../docs/gestor-lenguas/plantilla-uro.json): punto de
  partida del uro, con «COMPLETAR» y «PRUEBA» donde va el contenido real. Valida contra el esquema.

El admin permitirá descargar la plantilla y el paquete publicado. `pnpm pack:draft` queda reemplazado
por el script de exportación.

---

## 5. L4 — `/admin/lenguas`

| Pantalla                  | Qué hace                                                                                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/admin/lenguas`          | Las dos lenguas, con versión publicada, entradas (verificadas / total), temas y fecha. Reemplaza la tarjeta de `/admin/juego` en `/admin`.                                            |
| `/admin/lenguas/[lengua]` | Pestañas **Palabras**, **Juegos**, **Alfabeto**, **Fuentes**, **Publicar**. Arriba: «Subir JSON», «Descargar», «Probar» y el resumen de errores y avisos, que enlaza a cada problema. |
| Palabras                  | Editor de SP6b generalizado: búsqueda, filtros (sin verificar, sin dibujo, fuera del alfabeto), editar, **agregar**, quitar, «marcar como verificadas» con quién verificó.            |
| Juegos                    | Temas: nombre, icono, modo y qué entradas incluye (selector con búsqueda). Agregar y quitar temas.                                                                                    |
| Alfabeto                  | Grafías en orden (agregar, quitar, reordenar), vocales, variantes, confusables y su fuente. Vista previa del orden con las palabras cargadas.                                         |
| Fuentes                   | Lista editable. No se puede borrar una fuente que cita alguna entrada.                                                                                                                |
| Publicar                  | Nota obligatoria, versión esperada, conflicto si alguien publicó antes, historial con descargar y restaurar.                                                                          |

Usable a 360 px, objetivos ≥ 44 px, teclado completo.

---

## 6. L2 + L3 — Datos y sitio público

### 6.1 Tablas

`language_bundles (slug pk check in ('ashaninka','uro'), version, bundle jsonb, note, published_at)`
y `bundle_versions (slug, version, bundle, note, published_at, pk (slug, version))`, con las mismas
restricciones, permisos (RLS sin políticas, `grant` mínimo a `service_role`) y función de publicación
que `language_packs`. SQL en `docs/gestor-lenguas-schema.sql`, con su test.

### 6.2 Qué lee cada página

| Página                                | Lee del paquete                                              |
| ------------------------------------- | ------------------------------------------------------------ |
| `/diccionario/[lengua]` y su API      | Entradas verificadas, ordenadas y agrupadas por el alfabeto. |
| `/juegos/saltapalabras/[lengua]`      | Temas → entradas verificadas.                                |
| `/juegos/completar-palabras/[lengua]` | Entradas verificadas con ejemplo.                            |

Las dos lenguas se generan en el build (decisión #1) y se revalidan al publicar. La búsqueda del
diccionario filtra en memoria sobre el paquete cacheado.

### 6.3 Migración

- El paquete del asháninka se arma **del contenido actual del repo** (diccionario MINEDU 2021,
  alfabeto oficial, emojis) y del paquete publicado de Saltapalabras, sin agregar ni quitar palabras,
  y queda como respaldo en `src/data/bundles/ashaninka.json`.
- `language_packs` y `pack_versions` se copian a las tablas nuevas y quedan de solo lectura hasta
  retirarlas.
- El uro arranca sin paquete; su contenido lo sube el equipo (F2).

---

## 7. Criterios de aceptación

| ID      | Criterio                                                                                                                                             |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-L1-1 | `parseBundle` acepta un paquete válido y rechaza uno con `schema` distinto, un tema que referencia una entrada inexistente o una entrada sin fuente. |
| AC-L1-2 | Una palabra con letras fuera del alfabeto da un aviso, no un error.                                                                                  |
| AC-L1-3 | Los ejemplos y fixtures del formato usan palabras marcadas «PRUEBA».                                                                                 |
| AC-L2-1 | Publicar con versión vieja da conflicto y no cambia nada; restaurar crea una versión nueva.                                                          |
| AC-L2-2 | Si Supabase falla, la página sigue con la última versión buena; sin variables, el build usa el respaldo del repo.                                    |
| AC-L3-1 | Con el asháninka servido desde su paquete, `/diccionario/ashaninka` y los dos juegos se ven igual que antes.                                         |
| AC-L3-2 | Una entrada sin verificar no aparece en ninguna página pública ni en la API.                                                                         |
| AC-L3-3 | Las rutas de las dos lenguas salen en la tabla de `next build` como prerenderizadas; sin paquete del uro, sus páginas dicen que no hay contenido.    |
| AC-L4-1 | Subir un JSON válido del uro y publicarlo hace aparecer sus palabras verificadas en `/diccionario/uro` y su juego, sin desplegar.                    |
| AC-L4-2 | Subir un JSON sobre una lengua con contenido muestra el resumen de diferencias y no reemplaza nada sin confirmar.                                    |
| AC-L4-3 | Agregar una palabra y cambiar la traducción de otra desde «Palabras», y publicar, cambia el diccionario y los dos juegos.                            |
| AC-L4-4 | Reordenar el alfabeto cambia el orden del diccionario en la vista previa y, tras publicar, en el sitio.                                              |
| AC-L4-5 | No se puede borrar una fuente que alguna entrada cita.                                                                                               |
| AC-L4-6 | Todo el admin de lenguas funciona con teclado y a 360 px sin scroll horizontal.                                                                      |
| AC-L5-1 | Tras F4, el alfabeto y las palabras de ninguna de las dos lenguas están escritos en `src/lib/` ni `src/data/dictionary/`.                            |

---

## 8. Riesgos

- **Supabase gratis se pausa** tras 7 días sin actividad: el sitio sigue con lo cacheado y el
  respaldo, pero no se puede publicar hasta reactivarlo.
- **Uro**: sin alfabeto oficial ni hablantes, la calidad del contenido depende enteramente de las
  fuentes que traiga el equipo (decisión #11). El gestor exige fuente por palabra y la muestra.
- **Migrar sin cambiar nada visible** es la parte delicada: F1 existe solo para eso.

---

## 9. Cambios a otras specs

| Spec                                             | Cambio                                                                                                                                                    |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [saltapalabras.md](./saltapalabras.md)           | `language-pack/1` se absorbe en `language-bundle/1` (temas por referencia); SP3 y SP6/SP6b pasan a L2 y L4. La decisión #5 (uro sin paquete) se revierte. |
| [diccionario.md](./diccionario.md)               | El diccionario lee del paquete de lengua; el alfabeto deja de estar en `collation.ts`.                                                                    |
| [completar-palabras.md](./completar-palabras.md) | Las oraciones salen de los ejemplos de las entradas del paquete.                                                                                          |

Se marcan con una nota que apunte aquí; no se reescriben.

---

## 10. Preguntas abiertas

| #   | Pregunta                                                                       | Si no hay respuesta                                                         |
| --- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| P1  | ¿De qué fuente sale el primer contenido del uro y con qué alfabeto se escribe? | El gestor lo exige en el JSON; sin eso no se puede publicar (errores §4.2). |
| P2  | ¿`/admin/juego` se retira en F4 o convive un tiempo con `/admin/lenguas`?      | Se retira en F4, con su contenido migrado.                                  |
