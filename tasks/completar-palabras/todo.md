# TODO — Juego de completar palabras

> Plan y razonamiento: [plan.md](./plan.md) · Spec: [specs/completar-palabras.md](../../specs/completar-palabras.md)
> Estado: **en curso.** F1 cerrada.

Cada tarea cierra cuando pasan sus criterios **y** la definición de terminado (plan §6):
`pnpm check:task` · `pnpm test:e2e` · `pnpm build` con la ruta estática · verificado en navegador ·
accesibilidad en la propia tarea, no al final.

**Todo identificador nuevo va en inglés** (spec §11). Las dos excepciones son URL: la carpeta
`src/app/juegos/completar-palabras/` y el `params.lengua` que impone, que se desestructura de una vez:
`const { lengua: language } = await params`.

**El contenido está cerrado** en los ejemplos de `src/data/dictionary/ashaninka.json` (spec decisión
#12). Ninguna tarea acá importa contenido nuevo, ni toca `src/lib/dictionary/**`.

---

## F1 — Un ítem en pantalla

- [x] **T1.1** `lib/game/types.ts` (`Item` según spec §5.1) y `constants.ts` (`LESSON_SIZE = 10`, `HEARTS = 3`, `OPTIONS_PER_ITEM = 3`)
- [x] **T1.2** `lib/game/items.ts`: regla de generación de spec §5.2 (secuencia contigua de tokens, mínimo 3 tokens, solo la primera ocurrencia) + filtro **obligatorio** de distractores (glosa distinta) y hash determinista. **Tests primero, en rojo**, con fixtures propios `[AC-G1-2..10, AC-G1-12]`
      → _verifica:_ fixtures de lema de dos palabras, palabra aglutinada, oración de 2 tokens, palabra repetida, `ñ` vs `n`, y dos llamadas idénticas
- [x] **T1.3** `app/juegos/completar-palabras/[lengua]/page.tsx`: Server Component, `generateStaticParams` con **todas** las lenguas, `generateMetadata`, `notFound()` si la lengua no existe. Redirect en `next.config.ts` `[AC-G4-1, AC-G4-2, AC-G4-15]`
- [x] **T1.4** `components/game/`: `word-game.tsx` («use client»), `lesson-view.tsx`, `option-button.tsx`. Un ítem: enunciado en español, oración con hueco (con texto «espacio en blanco» para lectores), 3 fichas `<button>`, `lang="cni"` en la oración `[AC-G4-4, AC-G4-13]`
- [x] **T1.5** E2E `tests/e2e/word-game.spec.ts` (nombre en inglés a propósito, plan D5): redirect · enunciado + oración + 3 botones visibles · `klingon` 404. Y confirmar en `pnpm build` que la ruta sale **estática** `[AC-G4-1, AC-G4-2, AC-G4-4, AC-G4-15]`

> **⛔ Checkpoint 1** — validar `Item` contra los datos reales, antes de construir el motor encima.
> ¿Una palabra de 22 caracteres cabe legible en una ficha en móvil? ¿3 opciones o 2?
> ¿El hueco de `apiapitachari ñantsi` se entiende como un solo hueco?
> ¿`tokens: (string | null)[]` basta o hace falta índice + longitud?
> Cambiar `Item` acá es barato; después de F3 no.

---

## F2 — Feedback inmediato

- [x] **T2.1** `lib/game/lesson.ts` mínimo: estado + responder → correcto/incorrecto → avanzar. **Tests primero.** Sin vidas ni reencolado todavía `[AC-G2-1]`
- [x] **T2.2** `feedback-panel.tsx`: acierto/error **con icono y texto, nunca solo color** · oración completa de la fuente · glosa de la palabra · **fuente citada** vía `getSource()` · botón «Continuar» `[AC-G4-5, AC-G5-2]`
- [x] **T2.3** Foco al «Continuar» tras responder · `role="status"` en el panel · atajos `1`/`2`/`3` con `aria-keyshortcuts` `[AC-G4-11, AC-G4-12]`
- [ ] **T2.4** E2E: acertar muestra oración completa + fuente · fallar muestra la correcta · «Continuar» avanza · el foco queda donde debe `[AC-G4-5, AC-G4-11]`

---

## F3 — Lección completa y jugable

- [x] **T3.1** `lib/game/random.ts`: `mulberry32` + mezcla determinista. Tests: misma semilla, mismo resultado `[AC-G2-9]`
- [x] **T3.2** `buildLesson(pool, mastered, seed)` (spec §6.3): no dominados primero, mezcla sembrada, pool corto → lección corta. `mastered` vacío hasta F5. **Tests primero** `[AC-G2-7, AC-G2-8, AC-G2-9]`
- [x] **T3.3** El reducer completo (spec §6.2): cola, vidas, reencolado al final, barra que no retrocede, `completed`/`failed`, transición inválida ignorada. **Tests primero**, incluida la cota de no colgarse `[AC-G2-2..6, AC-G2-10, AC-G2-11]`
- [x] **T3.4** `lesson-progress.tsx` (`role="progressbar"` con `aria-valuenow/min/max`) y `hearts.tsx` (texto «Vidas: 2 de 3» para lector, iconos `aria-hidden`) `[AC-G4-6]`
- [x] **T3.5** `lesson-start.tsx`: pantalla de inicio **en el HTML estático**; la lección se compone al pulsar «Empezar», ya en el cliente (spec §6.4) `[AC-G4-3]`
- [x] **T3.6** `lesson-summary.tsx`: aciertos/total · vidas restantes · palabras falladas con oración y traducción · «Otra lección» · enlace a `/diccionario/ashaninka?palabra=<id>` `[AC-G4-7, AC-G4-8, AC-G4-17]`
- [ ] **T3.7** E2E: lección completa acertando · perdida por 3 errores · el ítem fallado reaparece · el enlace al diccionario abre la palabra. **Sin `waitForTimeout`** `[AC-G4-6, AC-G4-7, AC-G4-8, AC-G4-17]`
- [x] **T3.8** `prefers-reduced-motion`: sin animaciones de acierto ni error

> **⛔ Checkpoint 2 · hito H2 — jugarlo.** `pnpm dev` y jugar varias lecciones enteras.
> ¿`LESSON_SIZE = 10` o 7? ¿`HEARTS = 3` castiga de más a quien recién empieza?
> ¿El vocabulario escolar del MINEDU funciona, o el juego se siente como un examen?
> Son constantes: cambiarlas cuesta una línea, no jugar cuesta el producto.

---

## F4 — Distractores en serio y el guardián del pool

- [x] **T4.1** Preferencias de distractor (spec §5.4): misma `partOfSpeech` → misma cantidad de tokens → relajar, en ese orden. El filtro de glosa distinta **nunca** se relaja. Tests del orden de relajación `[AC-G1-4]`
- [x] **T4.2** `scripts/validate-game-items.ts` + `pnpm game:check`: piso de **100 ítems** · ítem sin hueco o con más de uno · distractor igual a la respuesta · `sourceId` ausente. Añadirlo a `check:task` `[AC-G1-11, AC-G5-3]`
- [x] **T4.3** `game:check --dump`: volcado legible del pool completo para la revisión humana
- [x] **T4.4** Test contra el diccionario real: el pool da **148** ítems y ≥ 100. Único test que toca los datos reales `[AC-G1-1]`

> **⛔ Checkpoint 3 · hito H1 — puerta humana, la única que queda.**
> `pnpm game:check --dump` y revisión por un hablante o docente asháninka: **¿hay ítems donde un
> distractor también funciona en el hueco?** La máquina no lo puede decidir (spec §5.4).
> Con 148 ítems es un volcado revisable de una sentada.
> **Bloquea la difusión, no el código:** F5 y F6 siguen mientras se consigue la revisión.

---

## F5 — Persistencia en el cliente

- [x] **T5.1** `lib/game/progress.ts`: clave versionada `living-langs:word-game:v1` · validación de forma · descarte de lo corrupto · valor neutro explícito si `localStorage` lanza. **Ningún `catch` vacío.** **Tests primero**, sustituyendo el store `[AC-G3-1..6, AC-G3-8]`
- [x] **T5.2** `use-progress.ts`: lee **después del montaje**, nunca durante el render. Escribe una vez, al cerrar la lección `[AC-G3-7]`
- [x] **T5.3** Conectar: contador «N lecciones completadas» en la pantalla de inicio · `mastered` real hacia `buildLesson` · un id que ya no existe en el pool se ignora sin romper `[AC-G3-9, AC-G4-9]`
- [x] **T5.4** Aviso discreto de «tu progreso no se va a guardar» si el almacenamiento no está disponible. Una vez, sin insistir `[AC-G4-10]`
- [ ] **T5.5** E2E: el progreso sobrevive a una recarga · **el juego se juega entero con `localStorage` bloqueado** `[AC-G4-9, AC-G4-10]`

---

## F6 — Uro, entrada desde el home, y cierre

- [ ] **T6.1** `unavailable-game.tsx` + rama de uro (spec §8.5): dice que está por venir **y por qué**, enlaza `docs/uro-language-sources.md` y el juego asháninka. **Sin prometer fecha.** Disponibilidad derivada de los datos, no de una bandera `[AC-G4-14]` · hito H3
- [ ] **T6.2** `components/resources.tsx`: tarjeta «Juegos» → `/juegos/completar-palabras/ashaninka` y grilla a `md:grid-cols-3 lg:grid-cols-5`. **Solo eso** `[AC-G4-16]`
- [ ] **T6.3** Auditoría de accesibilidad del recorrido completo: teclado de punta a punta, contraste, `aria-live`, etiquetas, foco `[AC-G4-11..13]`
- [ ] **T6.4** Medir el payload de la ruta en `pnpm build` contra los **50 KB comprimidos** (spec §5.6). Si se pasa, se recortan campos — **no** se sube el umbral
- [ ] **T6.5** `pnpm check:full` en verde · spec a `implementado` · fila de `specs/README.md` actualizada · preguntas abiertas cerradas que corresponda

---

## Fuera de alcance, para que no se cuele

No son olvidos. Están decididos en el spec §1 y §13:

- Racha diaria, XP, logros, tabla de posiciones.
- Otros tipos de ejercicio (letras dentro de una palabra, emparejar, traducir).
- Audio y pronunciación.
- Cuentas, login, sincronización, analítica.
- **Importar oraciones de cualquier fuente nueva**, ni siquiera con licencia limpia (decisión #12).
- Selector de lengua dentro del juego (pregunta abierta #5).
- Tocar `src/lib/dictionary/**`, `src/data/dictionary/**`, `src/lib/languages.ts` o `header.tsx`.
