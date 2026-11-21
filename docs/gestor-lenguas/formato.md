# Formato del paquete de lengua (`language-bundle/1`)

> Para quien prepara el contenido de diccionario y juegos. Spec: [gestor-lenguas.md](../../specs/gestor-lenguas.md).
> Fecha: 2026-11-21.

Cada lengua (asháninka y uro) es **un archivo JSON**. De ese archivo salen el diccionario, el juego
«Completar palabras» y Saltapalabras. Las dos lenguas usan **el mismo formato y funcionan igual**.

## Archivos

| Archivo                                                                    | Para qué                                                                            |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [`language-bundle.schema.json`](./language-bundle.schema.json)             | El esquema. VS Code lo usa para autocompletar y marcar errores al escribir.         |
| [`src/data/bundles/ashaninka.json`](../../src/data/bundles/ashaninka.json) | **Ejemplo real**: el asháninka completo en este formato (169 palabras).             |
| [`plantilla-uro.json`](./plantilla-uro.json)                               | Punto de partida para el uro. Todo lo que dice «COMPLETAR» o «PRUEBA» se reemplaza. |

## Cómo trabajar

1. Copia `plantilla-uro.json` donde quieras trabajar, por ejemplo `uro.json` en esta carpeta.
2. Ábrelo en VS Code. Gracias a la línea `"$schema"`, el editor **subraya en rojo** lo que falta o
   está mal, y al escribir sugiere los campos. Al pasar el mouse sobre un campo, explica qué va.
3. Completa el alfabeto, las fuentes, las palabras y los temas.
4. Cuando exista `/admin/lenguas` (fase F2), lo subes ahí, lo pruebas y lo publicas. El sitio lee
   lo publicado desde Supabase.

## Estructura

```
{
  "$schema": "...",               ← para que el editor valide; el sitio lo ignora
  "schema": "language-bundle/1",  ← siempre igual
  "language": "uro",              ← "ashaninka" o "uro"
  "translationLabel": "castellano",
  "alphabet": { ... },            ← las letras, en orden
  "speech": { ... },              ← voz del navegador (opcional)
  "sources": [ ... ],             ← de dónde sale todo
  "entries": [ ... ],             ← las palabras (la única lista)
  "themes": [ ... ]               ← temas de juego, que apuntan a palabras
}
```

### `alphabet`

| Campo           | Obligatorio | Qué va                                                                                    |
| --------------- | ----------- | ----------------------------------------------------------------------------------------- |
| `graphemes`     | sí          | Todas las letras **en su orden**, en minúscula. Un dígrafo («ch», «ts») es **una** letra. |
| `vowels`        | sí          | Las vocales. Cada una también tiene que estar en `graphemes`.                             |
| `vowelVariants` | no          | Formas que cuentan como una vocal: `{ "á": "a" }`.                                        |
| `confusable`    | no          | Letras que se confunden, para «letra inicial»: `{ "ts": ["ch", "s"] }`.                   |
| `sourceId`      | recomendado | La fuente que fija el alfabeto. **Para el uro es clave**: no hay alfabeto oficial.        |

El orden de `graphemes` es el orden alfabético del diccionario. Una palabra con una letra que no
está en `graphemes` no se rechaza, pero aparece como aviso.

### `sources`

| Campo                                 | Obligatorio | Qué va                                                                   |
| ------------------------------------- | ----------- | ------------------------------------------------------------------------ |
| `id`                                  | sí          | Corto, minúscula y guiones: `posnansky-1934`.                            |
| `kind`                                | sí          | `publication` (obra) o `speaker` (persona hablante que aportó o revisó). |
| `title`                               | sí          | Título, o cómo quiere figurar la persona.                                |
| `publisher`, `year`, `authors`, `url` | no          | Datos de la obra.                                                        |
| `license`                             | no          | Licencia o permiso de uso.                                               |
| `note`                                | no          | Por qué se usa, qué parte, qué limitaciones tiene.                       |

### `entries` (las palabras)

| Campo          | Obligatorio | Qué va                                                                                                    |
| -------------- | ----------- | --------------------------------------------------------------------------------------------------------- |
| `id`           | sí          | Estable, minúscula y guiones. **No lo cambies** al corregir la palabra: el progreso y los temas lo usan.  |
| `word`         | sí          | La palabra, con las letras del alfabeto.                                                                  |
| `translations` | sí          | Una o más. La primera es la que muestran los juegos.                                                      |
| `sourceId`     | sí          | Su fuente (un `id` de `sources`).                                                                         |
| `verified`     | sí          | `true` solo si alguien la verificó. **Las no verificadas no aparecen en el sitio.**                       |
| `verifiedBy`   | recomendado | Quién o qué la verificó.                                                                                  |
| `sourceRef`    | no          | Dónde en la fuente: `p. 112`.                                                                             |
| `partOfSpeech` | no          | `noun`, `verb`, `adjective`, `adverb`, `pronoun`, `interjection` o `phrase`.                              |
| `examples`     | no          | Oraciones `{ "sentence", "translation" }`. **Sin ejemplos, la palabra no entra en «Completar palabras».** |
| `emoji`        | no          | Un emoji. **Sin emoji, la palabra no entra en los temas de dibujos.**                                     |
| `variants`     | no          | Otras escrituras, también buscables.                                                                      |
| `notes`        | no          | Nota visible en el diccionario.                                                                           |
| `audio`        | no          | URL de una grabación (cuando exista la subida de audio).                                                  |

### `themes` (Saltapalabras)

| Campo      | Qué va                                                                                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`       | Minúscula y guiones.                                                                                                                                      |
| `name`     | Nombre visible: «Animales».                                                                                                                               |
| `icon`     | Un emoji para el botón del tema.                                                                                                                          |
| `mode`     | `pic2word` (dibujo → palabra), `word2pic` (palabra → dibujo), `first` (letra inicial), `vowel` (vocal que falta), `listen` (escuchar, cuando haya audio). |
| `entryIds` | Las palabras del tema, por su `id`. **No se copian**: si corriges una palabra, el tema la ve corregida.                                                   |

Para que un tema se pueda jugar necesita **al menos 3 palabras verificadas** que el modo pueda usar
(con emoji distintos en `pic2word`/`word2pic`; con la letra inicial en el alfabeto en `first`; con
al menos una vocal en `vowel`).

## Lo que bloquea publicar (errores)

- Una palabra sin `word`, sin traducción o sin una fuente que exista en `sources`.
- Dos palabras, fuentes o temas con el mismo `id`.
- Un tema que apunta a una palabra que no existe.
- Alfabeto vacío.
- El archivo pesa 2 MB o más.

Todo lo demás (palabra sin verificar, sin emoji, con letras fuera del alfabeto, tema con pocas
palabras) es un **aviso**: no impide publicar, solo explica qué no se va a ver.

## Reglas de contenido

- **Nunca palabras inventadas ni generadas con IA.** Cada palabra viene de una fuente citada.
- Los ejemplos de esta guía y la plantilla usan «PRUEBA» a propósito: no son palabras reales.
- Para el uro, la fuente del alfabeto y la de cada palabra se muestran en el sitio: quien lo lea
  tiene que poder saber de dónde sale.
