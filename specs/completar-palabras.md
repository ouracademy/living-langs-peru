# Juego de completar palabras

> Estado: **implementado** (G1-G4) · Fecha: 2026-09-12 · Rama: `feat/completar-palabras`
> Pendiente humano: revisión del pool por un hablante antes de difundir (§14, pregunta 1).
> Rama base: `main` · Plan: [tasks/completar-palabras/](../tasks/completar-palabras/) · Índice:
> [specs/README.md](./README.md)
> Depende de: [specs/diccionario.md](./diccionario.md) (implementado) como **única** fuente de
> contenido. El pool está cerrado ahí: decisión #12.

---

## 1. Objetivo

Un juego de **completar la palabra que falta en una oración** asháninka, al estilo del ejercicio de
huecos de Duolingo: se muestra la oración con un hueco y su traducción al español, y el usuario elige
la palabra correcta entre tres fichas. Sin cuenta, sin servidor: el progreso vive en el navegador.

El objetivo pedagógico es **reconocimiento de vocabulario en contexto**, no producción ni gramática.
Es el único ejercicio del juego: no hay otros tipos de ítem.

**Usuarios objetivo**

| Usuario                    | Necesidad principal                                                              |
| -------------------------- | -------------------------------------------------------------------------------- |
| Aprendiz / público general | Practicar vocabulario sin registrarse ni instalar nada, en sesiones cortas.      |
| Docente de EIB             | Una actividad lista para proyectar o dejar como práctica, sin gestionar cuentas. |
| Hablante / comunidad       | Ver su lengua tratada con ortografía correcta y contenido citado, no inventado.  |

**Qué NO es este trabajo**

- No es un curso ni un árbol de lecciones con unidades y niveles.
- No hay cuentas, login, ni sincronización entre dispositivos. El progreso es del navegador.
- No hay audio, ni pronunciación, ni reconocimiento de voz.
- No hay racha diaria ni XP. Se evaluaron y quedaron **fuera de alcance** (decisión #5).
- No hay otros tipos de ejercicio (ni completar letras dentro de una palabra, ni emparejar, ni
  traducir libremente).
- No hay contenido nuevo en asháninka: el juego **solo** usa oraciones ya citadas (§9).
- **El contenido está cerrado.** El pool son los ejemplos que ya están en
  `src/data/dictionary/ashaninka.json`, y nada más: ni fuentes nuevas, ni descargas, ni esperar
  permisos. Ampliarlo es otro trabajo, con su propio spec, y por la vía del diccionario (§9).
- No hay backend, ni base de datos, ni analítica de usuarios.

---

## 2. Decisiones tomadas

Cerradas por el pedido y por la respuesta a las preguntas de arranque. El resto del documento las
asume.

| #   | Decisión                             | Elección                                                                                                                                                                                       |
| --- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Tipo de ejercicio**                | **Palabra faltante en una oración.** Se muestra la oración asháninka con un hueco + su traducción al español; 3 fichas de palabra, una correcta. Es el único tipo de ítem.                     |
| 2   | **Ruta**                             | `/juegos/completar-palabras/[lengua]`. `/juegos/completar-palabras` redirige a `ashaninka`. El plural `juegos` deja sitio a un segundo juego sin migrar URLs.                                  |
| 3   | **Origen del contenido**             | **Solo los ejemplos del diccionario**, derivados en build de `src/data/dictionary/*.json` por una función pura. Cero contenido nuevo y ninguna fuente externa. Ver §9.                         |
| 4   | **Distractores**                     | Palabras **reales** de otras entradas del mismo diccionario, elegidas de forma determinista (§5.4). Nunca inventadas, nunca alteradas.                                                         |
| 5   | **Gamificación**                     | Tres mecánicas, y solo tres: **lección de N ítems con barra de progreso y resumen final**, **feedback inmediato con reintento**, y **vidas (corazones)**. Sin racha ni XP.                     |
| 6   | **Persistencia**                     | `localStorage`, no `sessionStorage`: el progreso debe sobrevivir al cierre de la pestaña. Esquema versionado (§7.2). Si el almacenamiento falla, el juego **sigue jugable**.                   |
| 7   | **Sin sesión**                       | Sin login, sin cookies, sin identificadores. Nada que salga del navegador.                                                                                                                     |
| 8   | **Uro**                              | `/juegos/completar-palabras/uro` es una página real que dice que aún no está disponible y por qué, con enlace al juego asháninka. No es un 404 ni un ítem deshabilitado.                       |
| 9   | **Lengua del código**                | Inglés, con la excepción de los segmentos de ruta bajo `src/app/`, que **son** la URL. Ver §11.                                                                                                |
| 10  | **Entrada desde el home**            | Se reusa la tarjeta que ya existía en `help-education.tsx`, rotulada «Games» y apuntando a `/juegos`, que no existía: pasa a «Juegos» y al juego. **No** se agrega tarjeta en `resources.tsx`. |
| 11  | **La lección se arma en el cliente** | La página es estática y renderiza una pantalla de inicio. La lección se compone al pulsar «Empezar», ya en el cliente. Así no hay desajuste de hidratación (§6.4).                             |
| 12  | **Sin fuentes nuevas**               | El pool crece **solo cuando crece el diccionario**, y eso se decide en el spec del diccionario, no acá. El juego no importa contenido: lo consume. Ver §9 y §13.                               |

---

## 3. Mapa de capacidades

**Cuatro capacidades por construir**, verificables por separado. Las flechas son dependencia, **no**
orden de escritura; el orden de tareas está en
[tasks/completar-palabras/plan.md](../tasks/completar-palabras/plan.md) y corta vertical.

```
                    ┌──> G2 lesson-engine ──┐
G1 game-items ──────┤                       ├──> G4 game-page
                    └──> G3 game-progress ──┘
```

G5 `game-sources` **no está en el mapa de construcción**: es un documento, ya entregado
([docs/game-sources.md](../docs/game-sources.md)), y su conclusión es la que cierra el contenido en
los ejemplos del diccionario (decisión #12). Se conserva en §9 con sus criterios de aceptación
intactos, porque siguen exigiéndose: cada ítem cita su fuente, y no entra contenido nuevo.

| id  | Módulo          | Entrega                                                                         | Depende de | Verificable por |
| --- | --------------- | ------------------------------------------------------------------------------- | ---------- | --------------- |
| G1  | `game-items`    | Generación pura y determinista de ítems desde el diccionario + script guardián. | —          | Vitest          |
| G2  | `lesson-engine` | Máquina de estados de la lección: cola, vidas, feedback, reintento, cierre.     | G1         | Vitest          |
| G3  | `game-progress` | Códec de `localStorage`: leer, validar, escribir, descartar lo corrupto.        | —          | Vitest (jsdom)  |
| G4  | `game-page`     | Ruta, UI, accesibilidad, pantalla de inicio, resumen, estado «uro».             | G1, G2, G3 | Playwright      |
| G5  | `game-sources`  | **Entregado como documento**, no es código: veredictos de licencia y el cierre. | —          | Revisión humana |

---

## 4. El contenido, que es todo el que habrá (medición, no estimación)

Esta tabla no es una foto de hoy: es el **techo** del contenido de este trabajo. Todo sale de los
ejemplos de `src/data/dictionary/ashaninka.json`, medidos el 2026-09-12.

| Métrica                                                                | Valor                      |
| ---------------------------------------------------------------------- | -------------------------- |
| Entradas totales                                                       | 169                        |
| Entradas con al menos un ejemplo                                       | 162                        |
| **Ítems generables** con la regla de §5.2                              | **148**                    |
| Entradas distintas cubiertas                                           | 147                        |
| Entradas descartadas porque la palabra aparece aglutinada o no aparece | 8                          |
| Ítems descartados por oración de menos de 3 palabras                   | 7                          |
| Longitud de oración en palabras (mín / mediana / máx)                  | 2 / 5 / 15                 |
| Traducciones compartidas por más de una entrada                        | 0                          |
| Clases de palabra presentes                                            | 142 sustantivos, 27 verbos |

**148 ítems son ~14 lecciones de 10** sin repetir ninguno. Es suficiente para lanzar, y es la cifra
con la que se lanza: sube sola si sube el diccionario, y por ninguna otra vía (decisión #12). El piso
de §5.5 vigila que no baje en silencio.

Dos hechos de estos datos condicionan el diseño:

1. **Las palabras son largas** (media 12,4 caracteres, máximo 22) y el asháninka es aglutinante. Por
   eso el ejercicio es «palabra faltante en la oración» y no «letra faltante en la palabra»: en 8
   entradas la forma canónica ni siquiera aparece tal cual en su propio ejemplo.
2. **Ninguna traducción se repite entre entradas.** La regla de distractores de §5.4 exige glosas
   distintas; hoy eso se cumple de fábrica, y la regla existe para cuando deje de cumplirse.

---

## 5. G1 — `game-items`

### 5.1 Modelo

`src/lib/game/types.ts`

```ts
/** One exercise: a sourced sentence with exactly one word blanked out. */
export type Item = {
  /** `${entryId}:${exampleIndex}` — stable across builds, so progress means something. */
  id: string;
  /** The sentence split into words, with the blank as `null`. */
  tokens: (string | null)[];
  /**
   * The word that fills the blank, in the dictionary's canonical spelling
   * (see 5.2, paso 7: NO la forma de superficie de la oración).
   */
  answer: string;
  /** Two real words from other entries. Order is decided at lesson time. */
  distractors: [string, string];
  /** The Spanish translation of the whole sentence — the prompt. */
  prompt: string;
  /** Spanish gloss of `answer`, shown in the feedback, not in the prompt. */
  answerTranslation: string;
  /** Points at `sources.json`, so every item can be attributed. */
  sourceId: string;
};
```

`tokens` guarda la oración ya partida y con el hueco marcado en vez de un índice, para que el
componente no tenga que volver a tokenizar ni reconstruir nada. La puntuación viaja pegada al token
que la lleva (`¿Timatsi` … `abishimotantsi?`), así la oración se vuelve a leer igual que en la fuente.

**Excepción, alrededor del hueco:** la puntuación que quedaba pegada a la palabra tapada se emite
como token propio (`¿Jaoka` · `ojitari` · `null` · `?`). Si viajara dentro del hueco, la oración
volvería mal armada. Consecuencia para la vista: un token que es **solo** puntuación se pinta sin
espacio delante.

### 5.2 Regla de generación

`buildItems(entries: Entry[]): Item[]`, pura y determinista.

Sin parámetro `language`: no hay nada por lengua en la generación (`normalize` no lo necesita y la
colación no se usa acá). Un parámetro que nadie lee es peso muerto, y el lint lo marca.

Para cada entrada y cada uno de sus ejemplos:

1. Tokenizar la oración por espacios, conservando la puntuación adherida.
2. Buscar la forma canónica (`word`) o una de sus `variants` como **secuencia contigua de tokens**,
   comparando en forma normalizada (`normalize` de `src/lib/dictionary/text.ts`, que preserva `ñ`).
   La comparación por secuencia, y no por token suelto, es lo que hace funcionar los 7 lemas de dos
   palabras del diccionario (`apiapitachari ñantsi`).
3. Si no aparece, **descartar el ejemplo**. No se recorta ni se fuerza la coincidencia: la palabra
   aglutinada dentro de otra no es la palabra.
4. Si la oración tiene **menos de 3 tokens**, descartar: tapar una de dos palabras deja una pista
   trivial.
5. Tapar **una sola** ocurrencia, la primera. Si la palabra aparece dos veces, las demás quedan
   visibles a propósito: son una pista legítima y evitan un hueco imposible.
6. Elegir dos distractores según §5.4. Si no se consiguen dos, descartar el ítem.
7. **La respuesta es la forma canónica de la entrada (`entry.word`), no la de la oración.** Medido
   sobre los datos reales: en **13 de los 148** ítems la palabra abre la oración, y una respuesta con
   mayúscula inicial al lado de dos distractores en minúscula **delata cuál es**. Un aprendiz
   acertaría sin saber la palabra, que es exactamente lo que el juego no puede permitirse.
   La alternativa —descartar esos 13— costaba contenido sin necesidad; la otra —capitalizar los
   distractores— sería alterar la ortografía de la fuente, prohibido por §5.3. El feedback muestra la
   oración original **tal cual**, así que la forma de superficie no se pierde: solo no se usa como
   ficha. Si la coincidencia fue por una `variants`, la ficha muestra igualmente la forma canónica,
   que es la que enseña el diccionario.
8. **Sin `sourceId` no hay ítem.** Se toma el del ejemplo y, si falta, el de la entrada; si no hay
   ninguno, el ejemplo se descarta. Mostrar una oración que no se puede citar rompería la promesa que
   el diccionario ya hace (§9, AC-G5-3).

El orden de salida es estable (orden de entradas × orden de ejemplos), así dos builds producen la
misma lista y `id` significa lo mismo la semana que viene.

### 5.3 Lo que nunca hace la generación

- **No inventa** palabras, oraciones ni traducciones. Regla dura del proyecto, ver §13.
- **No corrige** el español de la fuente. Las traducciones del MINEDU traen erratas
  («destinario», «hicmos»); se muestran tal cual y se reportan aguas arriba (§14, pregunta 2).
  Editarlas en silencio rompería la trazabilidad con la obra citada.
- **No traduce** ni completa lo que la fuente no dice.

### 5.4 Regla de distractores

Del mismo diccionario, en este orden de preferencia, y siempre determinista:

1. **Filtro obligatorio, nunca se relaja:** la glosa del candidato no comparte ninguna traducción
   normalizada con la respuesta. Un distractor que signifique lo mismo haría el ítem irresoluble.
2. **Preferencias, que sí se relajan en este orden:** misma `partOfSpeech` → misma cantidad de
   tokens que la respuesta → cualquier candidato.
3. **Elección determinista:** los candidatos se ordenan por un hash estable de `(item.id, entry.id)`
   y se toman los dos primeros. Determinista para poder testearlo, y distinto por ítem para que no
   salgan siempre las mismas dos palabras.
4. Si tras relajar las preferencias no hay dos candidatos, el ítem se descarta.

**Límite honesto de esta regla.** No podemos juzgar si un distractor es gramaticalmente imposible en
ese hueco: haría falta un analizador del asháninka que no tenemos, o un hablante. Un distractor
podría resultar aceptable en la oración. Se mitiga con tres cosas, no con una: el filtro de glosa
distinta, el feedback que **siempre** muestra la oración completa de la fuente con su cita, y la
revisión humana del volcado del script de §5.5 antes de lanzar (§14, pregunta 1). No se disimula con
una heurística inventada.

### 5.5 Script guardián

`pnpm game:check` (`scripts/validate-game-items.ts`):

- Falla si el pool de una lengua con diccionario baja de **100 ítems** (hoy 148). Ese es el número
  bajo el cual la variedad se nota y las lecciones empiezan a repetirse.
- Falla si algún ítem tiene `answer` vacía, `tokens` sin hueco, más de un hueco, o un distractor
  igual a la respuesta.
- Falla si un ítem no tiene `sourceId`.
- Con `--dump` imprime el pool completo en texto legible, para la revisión humana de §14.

### 5.6 Guardarraíl de tamaño

El pool completo viaja al cliente (decisión #11). Presupuesto: **≤ 50 KB comprimidos** para el
payload de datos de la ruta. Referencia: el diccionario entero pesa 14 KB comprimidos, y un ítem son
la oración, su traducción y tres palabras. Se mide con `pnpm build` y la tabla de rutas; si se pasa,
se recorta enviando solo los campos que la UI usa, no subiendo el número.

### 5.7 Criterios de aceptación

- **AC-G1-1** `buildItems` sobre el asháninka real devuelve ≥ 100 ítems, y exactamente 148 con los
  datos de hoy.
- **AC-G1-2** Todo ítem tiene exactamente un `null` en `tokens`.
- **AC-G1-3** Ninguna `answer` coincide con ninguno de sus `distractors`.
- **AC-G1-4** Ningún distractor comparte traducción normalizada con la respuesta.
- **AC-G1-5** Un lema de dos palabras (`apiapitachari ñantsi`) genera ítem, y el hueco cubre **las
  dos** palabras.
- **AC-G1-6** Una entrada cuya palabra no aparece en su ejemplo no genera ítem (fixture propio).
- **AC-G1-7** Una oración de 2 tokens no genera ítem.
- **AC-G1-8** Con la palabra repetida en la oración, solo se tapa la primera ocurrencia.
- **AC-G1-9** `buildItems` llamada dos veces devuelve exactamente lo mismo, ítems y distractores.
- **AC-G1-10** La coincidencia ignora tildes y caja pero **no** confunde `ñ` con `n`.
- **AC-G1-11** `game:check` pasa con los datos reales y falla con un fixture de 3 ítems.
- **AC-G1-12** Los tests usan fixtures propios: añadir palabras al diccionario no rompe la suite.

---

## 6. G2 — `lesson-engine`

### 6.1 Constantes

`src/lib/game/constants.ts`

```ts
export const LESSON_SIZE = 10; // ítems por lección
export const HEARTS = 3; // errores permitidos
export const OPTIONS_PER_ITEM = 3; // respuesta + 2 distractores
```

Tres opciones y no cuatro porque las palabras son largas (hasta 22 caracteres) y cuatro fichas no
caben legibles en un móvil sin encogerlas.

### 6.2 Estado y transiciones

Un reducer puro. Nada de fechas, aleatoriedad ni `localStorage` dentro: la semilla y el reloj entran
como argumento, que es lo que lo hace testeable.

```ts
type LessonState = {
  queue: Item[]; // pendientes, en orden
  current: Item | null;
  options: string[]; // las 3 palabras ya ordenadas para este ítem
  answered: number; // aciertos, es el numerador de la barra
  hearts: number;
  missed: Item[]; // fallados al menos una vez, para el resumen
  status: "playing" | "completed" | "failed";
};
```

Reglas, exactas:

- **Acierto:** `answered++`, el ítem sale de la cola, avanza la barra. Si la cola queda vacía →
  `completed`.
- **Error:** `hearts--`, el ítem se reencola **al final**, entra en `missed`. La barra **no** avanza.
  Si `hearts === 0` → `failed`, inmediatamente, sin esperar a vaciar la cola.
- El reencolado no tiene tope y no puede colgarse: cada error cuesta un corazón, así que hay a lo
  sumo 3 errores por lección.
- La barra de progreso es `answered / LESSON_SIZE`. No se mueve hacia atrás nunca.
- Entre responder y pasar al siguiente ítem hay un paso explícito de **feedback** que el usuario
  cierra con «Continuar». No hay avance automático: leer la oración correcta es la parte que enseña.

### 6.3 Composición de la lección

`buildLesson(pool: Item[], mastered: string[], seed: number): Item[]`

1. Primero los ítems **nunca acertados** (no están en `mastered`).
2. Si faltan para llegar a `LESSON_SIZE`, se completan con ítems ya acertados.
3. Dentro de cada grupo, se mezcla con un PRNG sembrado (`mulberry32`, en
   `src/lib/game/random.ts`).
4. Si el pool tiene menos de `LESSON_SIZE` ítems, la lección es más corta y la barra usa ese total.

La semilla la pone el cliente (`Date.now()`) y los tests una constante. El orden de las 3 fichas de
cada ítem sale del mismo PRNG, para que la respuesta correcta no caiga siempre en la misma posición.

### 6.4 Por qué la lección se arma en el cliente

Si el servidor mezclara la lección, el HTML prerenderizado traería un orden y el cliente generaría
otro: desajuste de hidratación. Y si la mezcla dependiera del progreso guardado, el servidor no
puede saberlo, porque el progreso vive en `localStorage`.

La salida es la que además mejora la UX: la página estática muestra una **pantalla de inicio** con el
título, las lecciones ya completadas y un botón «Empezar lección». La lección se compone al pulsarlo,
ya en el cliente. Cero mezcla durante la hidratación, y coincide con cómo se entra a una lección en
Duolingo.

### 6.5 Criterios de aceptación

- **AC-G2-1** Un acierto incrementa `answered` y saca el ítem de la cola.
- **AC-G2-2** Un error resta un corazón, reencola al final y **no** mueve `answered`.
- **AC-G2-3** Tres errores dejan `status === "failed"`, aunque queden ítems en la cola.
- **AC-G2-4** Acertar el último ítem deja `status === "completed"`.
- **AC-G2-5** Un ítem fallado y luego acertado cuenta una vez en `answered` y aparece en `missed`.
- **AC-G2-6** Una lección con 10 ítems y errores no puede tener más de 13 respuestas: no se cuelga.
- **AC-G2-7** `buildLesson` pone los ítems no dominados antes que los dominados.
- **AC-G2-8** Con un pool de 4 ítems, la lección tiene 4 y el total de la barra es 4.
- **AC-G2-9** La misma semilla da la misma lección y el mismo orden de fichas; otra semilla, otro.
- **AC-G2-10** La respuesta correcta no está siempre en la misma posición a lo largo de una lección.
- **AC-G2-11** Responder cuando `status !== "playing"` no cambia nada (transición inválida ignorada).

---

## 7. G3 — `game-progress`

### 7.1 Qué se guarda y qué no

Se guarda lo mínimo para que volver al juego tenga sentido: cuántas lecciones completó y qué ítems ya
acertó, por lengua.

**No se guarda** nada que identifique a nadie: ni nombre, ni correo, ni identificador generado, ni
cuánto tardó, ni desde dónde entró. No hay cuenta y no hay nada que enviar a ningún sitio.

### 7.2 Esquema, versionado

`src/lib/game/progress.ts`

```ts
const STORAGE_KEY = "living-langs:word-game:v1";

type Progress = {
  version: 1;
  languages: Record<
    string,
    {
      lessonsCompleted: number;
      /** Ids de ítem acertados alguna vez. Alimenta buildLesson. */
      masteredItemIds: string[];
      /** ISO date, solo para mostrar «última práctica». */
      lastPlayedAt: string;
    }
  >;
};
```

`version` va dentro del valor **y** en la clave. La clave versionada hace que un esquema nuevo no
tenga que migrar nada: escribe en otra clave y la vieja se ignora. El campo de dentro es el que
detecta un valor escrito por otra versión en la misma clave.

Los `masteredItemIds` son `${entryId}:${exampleIndex}`, así que un id sobrevive a añadir palabras al
diccionario. Un id que ya no existe en el pool se ignora al leer, no se borra: si el ejemplo vuelve,
el progreso vuelve con él.

### 7.3 Reglas de lectura y escritura

- **Se lee solo en el cliente, después del montaje.** `localStorage` no existe en el servidor; leerlo
  durante el render sería un error de hidratación garantizado.
- **Todo dato leído es sospechoso.** Se valida la forma antes de usarla (`version`, tipos de cada
  campo). Si no valida, se **descarta y se empieza de cero**; no se intenta reparar a medias.
- **Si el almacenamiento no está disponible, el juego sigue jugable.** En modo privado o con las
  cookies de sitio bloqueadas, tanto leer como escribir pueden lanzar. El códec devuelve un progreso
  vacío y las escrituras no hacen nada. La UI lo dice una vez, discreto, y no vuelve a molestar.
  Ningún `catch` queda vacío (lo prohíbe `check:floor`): cada uno devuelve el valor neutro explícito.
- **Se escribe al terminar una lección**, no en cada respuesta: una escritura por lección en vez de
  diez, y nada a medias si se cierra la pestaña a mitad.

### 7.4 Criterios de aceptación

- **AC-G3-1** Leer con `localStorage` vacío devuelve un progreso vacío, sin lanzar.
- **AC-G3-2** Escribir y volver a leer devuelve el mismo progreso.
- **AC-G3-3** Un JSON corrupto se descarta y devuelve progreso vacío, sin lanzar.
- **AC-G3-4** Un valor con `version` distinta se descarta.
- **AC-G3-5** Un valor con la forma bien pero un campo del tipo equivocado se descarta.
- **AC-G3-6** Con `localStorage` que lanza al leer y al escribir, la API devuelve vacío y no propaga.
- **AC-G3-7** Completar una lección incrementa `lessonsCompleted` y agrega solo los ítems acertados.
- **AC-G3-8** El progreso de una lengua no toca el de la otra.
- **AC-G3-9** Un `masteredItemIds` con un id que ya no existe en el pool no rompe `buildLesson`.

---

## 8. G4 — `game-page`

### 8.1 Contrato de URL

| URL                                     | Comportamiento                                                     |
| --------------------------------------- | ------------------------------------------------------------------ |
| `/juegos/completar-palabras`            | Redirige (no permanente) a `/juegos/completar-palabras/ashaninka`. |
| `/juegos/completar-palabras/ashaninka`  | El juego.                                                          |
| `/juegos/completar-palabras/uro`        | Página «aún no disponible» (§8.5).                                 |
| `/juegos/completar-palabras/cualquiera` | 404.                                                               |

Sin query params. El estado de la lección **no** va a la URL: es efímero y compartir «estoy en el
ítem 4» no significa nada. Así la ruta queda prerenderizada, igual que la del diccionario.

`generateStaticParams` devuelve todas las lenguas conocidas, no solo las jugables: una lengua que
conocemos explica, no devuelve 404.

### 8.2 Pantallas

Tres, y el usuario siempre sabe en cuál está.

**Inicio** (HTML estático) — título, una línea de qué se hace, `N lecciones completadas` (tras
montar, desde el progreso), botón «Empezar lección». Es la única pantalla en el HTML prerenderizado.

**Lección** — de arriba a abajo: barra de progreso y corazones, la traducción al español (el enunciado),
la oración asháninka con el hueco, las 3 fichas. Al responder, la ficha elegida se marca y aparece el
panel de feedback con la oración completa, la glosa de la palabra, la fuente citada y «Continuar».

**Resumen** — aciertos sobre total, corazones restantes, la lista de las palabras falladas con su
oración y traducción (es la parte que enseña), y dos acciones: «Otra lección» y «Ver en el diccionario»,
que enlaza a `/diccionario/ashaninka?palabra=<id>` de una palabra fallada. Reutiliza el deep-link que
el diccionario ya soporta.

Si la lección terminó en `failed`, el resumen lo dice sin dramatismo y ofrece reintentar. Perder no
bloquea nada: no hay vidas que se recarguen con el tiempo ni nada que esperar.

### 8.3 Accesibilidad (obligatorio, no opcional)

- Las fichas son `<button>` reales, alcanzables con Tab y activables con Enter y Espacio.
- **Atajos 1, 2, 3** para elegir ficha, declarados con `aria-keyshortcuts`.
- Al responder, el **foco pasa al botón «Continuar»**. Sin esto, quien navega con teclado queda
  perdido después de cada respuesta.
- El feedback vive en un `role="status"` (cortés): se anuncia solo, sin interrumpir.
- **Correcto e incorrecto nunca se comunican solo con color:** llevan icono y texto («Correcto»,
  «Incorrecto»).
- Los corazones son texto para el lector de pantalla («Vidas: 2 de 3»); los iconos van
  `aria-hidden`.
- La barra usa `role="progressbar"` con `aria-valuenow`/`min`/`max` y etiqueta «Progreso de la
  lección».
- La oración asháninka lleva `lang="cni"` (de `getLanguageCode`), y el enunciado en español no lo
  lleva. Sin eso, un lector de pantalla lee asháninka con fonética española.
- El hueco tiene texto solo para lectores («espacio en blanco»), porque un guion largo no se anuncia.
- Con `prefers-reduced-motion` no hay animaciones de acierto ni de error.

### 8.4 Componentes

```
src/components/game/
├── word-game.tsx        "use client" — dueño del estado, orquesta las 3 pantallas
├── lesson-start.tsx     pantalla de inicio
├── lesson-view.tsx      enunciado + oración con hueco + fichas
├── option-button.tsx    una ficha
├── feedback-panel.tsx   correcto/incorrecto + oración completa + fuente + «Continuar»
├── lesson-summary.tsx   resumen final
├── hearts.tsx
├── lesson-progress.tsx
└── use-progress.ts      hook cliente sobre src/lib/game/progress.ts
```

Si `word-game.tsx` pasa de ~150 líneas, se parte. La lógica no vive acá: vive en `src/lib/game/`,
que no importa nada de React.

### 8.5 Uro: «próximamente», sin prometer de más

El juego necesita oraciones citadas, y en uro no hay ninguna. El motivo ya está investigado y es más
serio que «falta hacerlo»: el uro **no tiene hablantes desde los años 1920 y no tiene alfabeto
oficial** (ver [docs/uro-language-sources.md](../docs/uro-language-sources.md)).

Así que la página dice que está por venir **y** por qué, y enlaza la investigación. No dice «pronto»
a secas: prometer una fecha que depende de un trabajo de recuperación lingüística sería faltar el
respeto al tema. El copy exacto se redacta en la tarea, con esta forma:

> **Completar palabras en uro — próximamente.** Todavía no podemos armar el juego en uro: necesita
> oraciones de ejemplo con fuente, y hoy no existe un corpus uro normalizado. [Por qué] ·
> [Jugar en asháninka]

La disponibilidad se **deriva de los datos** (¿hay pool de ítems para esta lengua?), no de una
bandera nueva en `languages.ts`. Misma regla que el diccionario.

### 8.6 Criterios de aceptación

- **AC-G4-1** `/juegos/completar-palabras` redirige a `/juegos/completar-palabras/ashaninka`.
- **AC-G4-2** La ruta aparece como estática en la tabla de `pnpm build`.
- **AC-G4-3** La pantalla de inicio está en el HTML servido (visible con JS desactivado).
- **AC-G4-4** «Empezar lección» muestra un ítem: enunciado en español, oración con hueco, 3 fichas.
- **AC-G4-5** Acertar avanza la barra y muestra feedback de acierto con la oración completa.
- **AC-G4-6** Fallar resta un corazón, muestra la respuesta correcta, y el ítem reaparece después.
- **AC-G4-7** Tres fallos llevan al resumen con el resultado de lección perdida y opción de reintentar.
- **AC-G4-8** Completar la lección muestra el resumen con aciertos y palabras falladas.
- **AC-G4-9** Recargar después de completar una lección muestra el contador de lecciones aumentado.
- **AC-G4-10** Con `localStorage` bloqueado, el juego se puede jugar de principio a fin.
- **AC-G4-11** Recorrido completo con teclado: Tab a la ficha, Enter, foco en «Continuar», Enter.
- **AC-G4-12** Los atajos 1/2/3 eligen ficha.
- **AC-G4-13** La oración asháninka tiene `lang="cni"`.
- **AC-G4-14** `/juegos/completar-palabras/uro` responde 200 y explica por qué no está.
- **AC-G4-15** `/juegos/completar-palabras/klingon` responde 404.
- **AC-G4-16** La tarjeta «Juegos» del home (la del centro de educación) lleva al juego.
- **AC-G4-17** El resumen enlaza a la palabra fallada en el diccionario y esa palabra se abre.

---

## 9. G5 — `game-sources` (cerrado)

**Una sola fuente, y está cerrada.** El juego se alimenta del vocabulario pedagógico del MINEDU 2021,
ya importado, citado y con su copia local auditable: de ahí salen las 148 oraciones de §4, cada una
con su `sourceId` visible en el feedback del juego.

Se investigaron candidatas para ampliar y **ninguna entra**: dos bloquean por licencia (ND o sin
licencia declarada), dos no se pudieron verificar porque el sitio bloquea el acceso automatizado — y
no se intenta sortear esa verificación —, una es de **otra variedad** (ashéninka del Perené, no
asháninka) y mezclarla con nuestra ortografía oficial sería un error de datos disfrazado de más
contenido, y la única con licencia limpia (Wikipedia Incubator, CC BY-SA) se descarta por calidad:
texto comunitario sin revisión lingüística, que en un juego que enseña convertiría la errata de un
editor anónimo en algo que alguien aprende como correcto.

El veredicto por fuente, con fecha y método de comprobación, está en
**[docs/game-sources.md](../docs/game-sources.md)**. Ese documento también anota qué desbloquearía
más contenido; eso es **investigación a futuro, no alcance de este trabajo**.

Consecuencia para el alcance: **G5 no agrega contenido, y este trabajo no importa ninguna oración
nueva.** Si el pool tiene que crecer, crece por el diccionario — su spec, su validación, su
atribución — y el juego lo hereda gratis sin tocar una línea (decisión #12).

### 9.1 Criterios de aceptación

- **AC-G5-1** `docs/game-sources.md` existe y da veredicto de licencia por fuente, con la fecha y el
  método de comprobación.
- **AC-G5-2** Cada ítem del juego muestra la fuente de su oración en el feedback.
- **AC-G5-3** Ninguna oración del juego carece de `sourceId` (lo verifica `game:check`).
- **AC-G5-4** No se agrega **ninguna** fuente de oraciones en este trabajo. El pool sale entero del
  diccionario, y ampliarlo requiere una decisión humana escrita y otro spec.

---

## 10. Estructura de archivos

Todo nuevo salvo donde se indique. Nombres en inglés; los segmentos bajo `src/app/` son la URL y van
en español.

```
src/
├── app/juegos/completar-palabras/
│   └── [lengua]/page.tsx                  G4  Server Component
├── components/game/                       G4  (ver §8.4)
└── lib/game/
    ├── index.ts                           G1  API del módulo
    ├── types.ts                           G1
    ├── items.ts                           G1  buildItems + distractores
    ├── lesson.ts                          G2  buildLesson + reducer
    ├── random.ts                           G2  PRNG sembrado (mulberry32)
    ├── progress.ts                        G3  códec de localStorage
    └── constants.ts                       G1/G2

scripts/validate-game-items.ts             G1

tests/
├── unit/game/
│   ├── fixtures.ts                        fixtures propios, no el diccionario real
│   ├── items.test.ts                      G1
│   ├── lesson.test.ts                     G2
│   └── progress.test.ts                   G3
└── e2e/word-game.spec.ts                  G4

docs/game-sources.md                       G5

MODIFICADOS:
  next.config.ts                 redirect /juegos/completar-palabras -> .../ashaninka
  src/components/help-education.tsx  «Games» -> «Juegos» y su href   (decisión #10)
  package.json                   script game:check
  specs/README.md                fila en el índice
```

`src/lib/languages.ts` y `src/lib/dictionary/**` **no se modifican**. El juego es consumidor del
diccionario, no coautor: si hace falta algo de la capa de diccionario que hoy no expone, se pregunta
antes de tocarla (§13).

El nombre del archivo e2e es `word-game.spec.ts` y no `completar-palabras.spec.ts` a propósito:
`check:language` marca los nombres de archivo en español fuera de `src/app/`, y «palabra» está en su
lista de términos.

---

## 11. Estilo de código

Manda [AGENTS.md](../AGENTS.md) y [CONSTRAINTS.md](../CONSTRAINTS.md). Lo específico de este trabajo:

- **Código en inglés, personas en español.** `item`, `lesson`, `hearts`, `answer`, `blank`,
  `sentence`, `prompt` — no `palabra`, `leccion` ni `ejemplo`. El copy de la UI, en español.
- **Dos excepciones, ambas porque son URL:** `src/app/juegos/completar-palabras/` y el `params.lengua`
  que impone la carpeta, que se renombra en la primera línea:
  `const { lengua: language } = await params`.
- `src/lib/game/` **no importa React** y no toca `window`. Es lógica pura, testeable con Vitest sin
  DOM; `progress.ts` es la única que habla con `localStorage`, y detrás de una API que se puede
  sustituir en un test.
- Server Components por defecto; `"use client"` solo en `src/components/game/`.
- TypeScript estricto. Sin `any`, sin `@ts-ignore`, sin `eslint-disable`. `check:floor` los bloquea, y
  la respuesta a un checker que se queja es arreglar el código, no callarlo.
- Tailwind v4 con los tokens de `globals.css`.
- Commits en Conventional Commits, sujeto en minúscula e imperativo (`feat: add word game items`).

---

## 12. Estrategia de pruebas

**Vitest — lógica pura (G1, G2, G3).** Es donde esto se rompe en silencio.

- `items.test.ts` — la regla de generación y la de distractores, con fixtures diseñados: lema de dos
  palabras, palabra aglutinada, oración corta, palabra repetida, `ñ` frente a `n`, determinismo.
- `lesson.test.ts` — el reducer entero: acierto, error, reencolado, corazones a cero, cola vacía,
  transición inválida, y la cota de que no se cuelga.
- `progress.test.ts` — el códec: vacío, ida y vuelta, JSON corrupto, versión distinta, campo con tipo
  equivocado, y `localStorage` que lanza. Se sustituye `localStorage` en el test, no se confía en el
  del entorno.
- **Fixtures propios.** Un solo test toca el diccionario real: el de AC-G1-1, que comprueba el tamaño
  del pool. Añadir palabras no debe romper la suite.

**Playwright — el flujo completo (G4).** Contra `next build && next start`, como ya está configurado.

- La lección de principio a fin, acertando.
- La lección perdida por tres errores.
- El progreso que sobrevive a una recarga.
- **El juego con `localStorage` bloqueado** (se corta el acceso en el contexto del navegador). Es el
  caso que más fácil se rompe y el que dejaría la página en blanco.
- Recorrido completo con teclado, incluido dónde queda el foco tras responder.
- La página de uro.
- La tarjeta del home.

**Definición de terminado, por módulo:** `pnpm check:task` pasa (tipos, lint, piso, idioma, datos,
tests, cobertura ≥ 80 % de las líneas tocadas) · `pnpm build` pasa y la ruta sigue estática ·
comportamiento verificado en un navegador de verdad · sin regresiones en el diccionario ni en el home.

---

## 13. Límites

**Hacer siempre**

- Leer el doc correspondiente en `node_modules/next/dist/docs/` antes de usar una API de Next que el
  repo no use ya (AGENTS.md). Esta versión trae cambios que rompen respecto a lo conocido.
- Mantener la lógica en `src/lib/game/`, pura y sin React.
- Derivar la disponibilidad de una lengua de los datos, no de una bandera.
- Mostrar la fuente de cada oración en el feedback.
- Dejar el juego jugable aunque `localStorage` falle.
- Correr `pnpm check:fast` al editar y `pnpm check:task` al cerrar una tarea. `nvm use` antes de
  commitear.

**Preguntar primero**

- Añadir cualquier dependencia. Este trabajo no necesita ninguna nueva: el PRNG son ocho líneas y no
  justifica un paquete.
- Cambiar la ruta, o meter estado de la lección en la URL.
- Tocar `src/lib/dictionary/**`, `src/data/dictionary/**`, `src/lib/languages.ts` o `header.tsx`.
- Tocar `help-education.tsx` más allá del rótulo y el `href` de su tarjeta (decisión #10).
- Agregar una tarjeta en `resources.tsx`: se evaluó y se descartó, ya había una para juegos.
- Agregar racha, XP, logros, tabla de posiciones, audio u otro tipo de ejercicio: quedó fuera de
  alcance por decisión, no por olvido (decisión #5).
- Añadir cualquier cosa que mande datos fuera del navegador, analítica incluida.
- Importar una fuente nueva de oraciones (§9).

**Nunca**

- **Inventar palabras, oraciones, traducciones o distractores en una lengua originaria.** Si falta
  contenido, se deja el hueco y se dice. Un dato falso en una lengua originaria es peor que la
  ausencia de dato. Esto incluye «rellenar» el pool con variantes generadas de palabras reales.
- **Importar una oración nueva de cualquier fuente en este trabajo**, ni siquiera de una con veredicto
  `usable`. El contenido está cerrado en los ejemplos del diccionario (decisión #12). El pool pequeño
  es una restricción aceptada, no un problema que se arregla trayendo contenido por la puerta de atrás.
- Editar en silencio el contenido de una fuente citada, erratas incluidas (§5.3).
- Guardar datos personales, ni generar un identificador de usuario.
- Suprimir errores de tipos o de lint para llegar a verde, ni saltear o borrar tests, ni bajar un
  umbral de `CONSTRAINTS.md`.
- Mezclar variedades: ashéninka del Perené no es asháninka (§9).
- Refactorizar el diccionario o el home «de paso».
- Commitear con la suite roja.

---

## 14. Preguntas abiertas

| #   | Pregunta                                                                                                                                                                                                                                                                                                                 | Quién decide                    | Bloquea                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- | ----------------------------- |
| 1   | **Revisión por hablante o docente asháninka del pool generado** (`game:check --dump`), para detectar ítems donde un distractor también sea válido en el hueco. Con el contenido cerrado en 148 ítems, esto pasa de aspiración a tarea concreta: es un volcado finito y revisable de una sentada (checkpoint 3 del plan). | Persona del proyecto + hablante | El lanzamiento, no el código. |
| 2   | Las erratas del español de la fuente («destinario», «hicmos») se muestran tal cual. ¿Se reportan al MINEDU por la vía institucional ya abierta?                                                                                                                                                                          | Persona del proyecto            | Nada.                         |
| 3   | ¿`LESSON_SIZE = 10` es lo correcto para este vocabulario escolar, o conviene 7? Se decide viéndolo, no discutiéndolo.                                                                                                                                                                                                    | Se prueba en el navegador       | Nada. Es una constante.       |
| 4   | ~~Con 148 ítems, alguien constante los agota en ~14 lecciones. ¿Qué se hace entonces?~~ **Resuelta:** se repite, y `buildLesson` prioriza lo no dominado, que es lo que ya hace. No se rellena con contenido inventado ni traído de fuera. El pool crece solo si crece el diccionario.                                   | Cerrada (decisión #12)          | Nada.                         |
| 5   | ¿Selector de lengua en el juego? Con una sola lengua jugable no aporta; se deja fuera y se revisa cuando haya dos.                                                                                                                                                                                                       | Producto                        | Nada.                         |

## 15. Aprobación

- [ ] Tipo de ejercicio y mecánicas (§1, §2, §6)
- [ ] Mapa de capacidades (§3)
- [ ] Modelo de ítem y regla de generación (§5.1, §5.2)
- [ ] Regla de distractores y su límite honesto (§5.4)
- [ ] Esquema y reglas de persistencia (§7)
- [ ] Contrato de URL y pantallas (§8.1, §8.2)
- [ ] Accesibilidad (§8.3)
- [ ] Estado de uro (§8.5)
- [ ] Fuentes y lo que no se importa (§9)
- [ ] **Contenido cerrado a los ejemplos del diccionario** (§1, decisión #12, §4)
- [ ] Límites (§13)
