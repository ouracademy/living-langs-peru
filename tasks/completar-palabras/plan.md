# Plan de implementación — Juego de completar palabras

> Spec: [specs/completar-palabras.md](../../specs/completar-palabras.md) · Fecha: 2026-09-12
> Rama base: `main` · Lista de tareas ejecutable: [todo.md](./todo.md)

---

## 1. Cómo se corta el trabajo

El mapa `G1..G4` del spec (§3) describe **qué depende de qué**, no en qué orden se escribe el código.
Tomado literalmente sería horizontal: primero toda la generación de ítems, luego todo el motor de
lección, luego la interfaz. Con eso no habría nada jugable hasta el final, y el modelo `Item` se
validaría contra una pantalla recién cuando ya fuera caro cambiarlo.

Este plan corta **vertical**: cada fase termina con `/juegos/completar-palabras/ashaninka`
funcionando y con algo más que antes. Las etiquetas `G1..G5` se conservan en cada tarea para rastrear
la trazabilidad con el spec.

```
F1 «un ítem en pantalla» ──> F2 feedback inmediato ──> F3 lección completa
                                                              │
                              F4 distractores + guardián <────┘
                                                              │
                              F5 persistencia <───────────────┘
                                                              │
                              F6 uro + home + cierre <────────┘
```

**No hay fase de andamiaje.** El plan del diccionario empezó con una F0 de infraestructura; acá no
hace falta. Vitest, Playwright, `check:fast`, `check:task` y los hooks de husky ya existen y están
verdes. Se empieza directo en producto.

**Por qué F1 ya lleva el filtro obligatorio de distractores.** El filtro de glosa distinta (spec
§5.4, regla 1) es lo único que impide un ítem con dos respuestas válidas. Un ítem así en pantalla,
aunque sea «temporal», es exactamente el error que este juego no puede permitirse: enseña mal. Las
_preferencias_ de distractor (misma clase de palabra, misma cantidad de tokens) sí son refinamiento y
esperan a F4.

**Por qué la persistencia (F5) va tan tarde.** Es la única pieza que toca `window`, y la que más
fácil rompe la hidratación. Entra cuando ya hay un juego funcionando contra el que comparar, no
antes. `buildLesson` nace en F3 con `mastered` como parámetro, que hasta F5 llega vacío: la firma no
cambia, solo deja de recibir una lista vacía.

**Por qué la accesibilidad no es una fase.** Está en la definición de terminado de cada tarea (§6):
fichas como `<button>` desde F1, el foco tras responder en F2, `role="status"`, `lang="cni"`, nunca
solo color. F6 es la **auditoría**, no la primera vez que se piensa. Dejarla toda al final es cómo se
termina reescribiendo la interfaz.

---

## 2. Decisiones de implementación

Las decisiones de producto están en el spec §2. Acá solo lo que es puramente de ejecución.

| #   | Decisión                                                                                                                                                                                                                                                                                  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **`src/lib/game/` no importa React ni toca `window`.** Es lógica pura, testeable sin DOM. `progress.ts` es la única que habla con `localStorage`, y detrás de una API sustituible en un test.                                                                                             |
| D2  | **La página `async` no se testea con Vitest** (misma razón que el diccionario: Next no soporta Server Components asíncronos en Vitest). La ruta y sus pantallas se verifican con Playwright.                                                                                              |
| D3  | **Cero dependencias nuevas.** El PRNG son ocho líneas (`mulberry32`); un paquete para eso no se justifica. Si algo parece necesitar una dependencia, se pregunta antes (spec §13).                                                                                                        |
| D4  | **Todo nace en inglés.** No se escribe nada en español para renombrarlo después. Las dos excepciones son URL: la carpeta `src/app/juegos/completar-palabras/` y el `params.lengua` que impone, que se desestructura en la primera línea.                                                  |
| D5  | **El archivo e2e se llama `word-game.spec.ts`**, no `completar-palabras.spec.ts`: `check:language` marca los nombres de archivo en español fuera de `src/app/`, y «palabra» está en su lista de términos. Verificado contra `scripts/check-language-policy.ts` antes de escribir el plan. |
| D6  | **`game:check` entra en `check:task`**, no solo en `check:full`. Es el guardián de que el pool no se caiga en silencio; si corre solo en CI, la caída se descubre tarde.                                                                                                                  |
| D7  | **Los tests de `items.ts` usan fixtures propios**, salvo uno. El único que toca `src/data/dictionary/ashaninka.json` es el de AC-G1-1 (tamaño del pool). Así, añadir palabras al diccionario no rompe la suite — que es justo lo que tiene que pasar, porque el diccionario va a crecer.  |

---

## 3. Fases

Cada tarea lleva: qué entrega, cómo se verifica, y qué criterios de aceptación del spec cierra.
`S` ≈ menos de media hora · `M` ≈ una a dos horas · `L` ≈ media jornada.

---

### F1 — Un ítem en pantalla (corte vertical mínimo)

Primer recorrido completo: JSON del diccionario → generación → Server Component → HTML con 3 fichas.
No hay lógica de juego: pulsar una ficha todavía no hace nada.

| Tarea | Entrega                                                                                                                                                                                                                                                         | Tam. | AC del spec                         |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ----------------------------------- |
| T1.1  | `src/lib/game/types.ts` (§5.1) y `constants.ts` (`LESSON_SIZE`, `HEARTS`, `OPTIONS_PER_ITEM`).                                                                                                                                                                  | S    | —                                   |
| T1.2  | `src/lib/game/items.ts`: la regla de generación completa de §5.2 (secuencia contigua, mínimo 3 tokens, primera ocurrencia) + el filtro obligatorio de distractores y el hash determinista. **Tests primero, en rojo**, con fixtures propios.                    | L    | AC-G1-2 a AC-G1-10, AC-G1-12        |
| T1.3  | `src/app/juegos/completar-palabras/[lengua]/page.tsx`: Server Component, `generateStaticParams()` con **todas** las lenguas, `generateMetadata()`, `notFound()` para la lengua desconocida. Redirect en `next.config.ts`. Desestructurar `lengua` → `language`. | M    | AC-G4-1, AC-G4-2, AC-G4-15          |
| T1.4  | `src/components/game/` mínimo: `word-game.tsx` («use client»), `lesson-view.tsx`, `option-button.tsx`. Muestra el primer ítem del pool: enunciado en español, oración con el hueco, 3 fichas como `<button>` reales. `lang="cni"` en la oración.                | M    | AC-G4-4, AC-G4-13                   |
| T1.5  | E2E: la ruta redirige · se ve un enunciado, una oración con hueco y 3 botones · `klingon` da 404 · confirmar en `pnpm build` que la ruta sale **estática**, no `ƒ`.                                                                                             | M    | AC-G4-1, AC-G4-2, AC-G4-4, AC-G4-15 |

> ### ⛔ Checkpoint 1 — validar el modelo `Item` contra los datos reales
>
> Con una pantalla de verdad delante, y **antes** de construir el motor encima:
>
> - ¿Una palabra de 22 caracteres cabe legible en una ficha, en móvil? ¿3 opciones o 2?
> - ¿El hueco de un lema de dos palabras (`apiapitachari ñantsi`) se entiende como un solo hueco?
> - ¿`tokens: (string | null)[]` basta, o hace falta guardar el índice y la longitud del hueco?
> - ¿El enunciado en español delata demasiado, o poco?
>
> Cambiar `Item` acá es barato. Después de F3, no.

---

### F2 — Feedback inmediato (el núcleo pedagógico)

| Tarea | Entrega                                                                                                                                                                                                             | Tam. | AC del spec        |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------ |
| T2.1  | `src/lib/game/lesson.ts` mínimo: estado + acción de responder, que marca correcto/incorrecto y avanza. **Tests primero.** Sin vidas ni reencolado todavía.                                                          | M    | AC-G2-1            |
| T2.2  | `feedback-panel.tsx`: correcto/incorrecto **con icono y texto**, nunca solo color. Muestra la oración completa de la fuente, la glosa de la palabra, y **la fuente citada** (vía `getSource()`). Botón «Continuar». | M    | AC-G4-5, AC-G5-2   |
| T2.3  | Gestión de foco: al responder, el foco pasa a «Continuar». `role="status"` en el panel. Atajos `1`/`2`/`3` con `aria-keyshortcuts`.                                                                                 | M    | AC-G4-11, AC-G4-12 |
| T2.4  | E2E: acertar muestra el panel con la oración completa y la fuente · fallar muestra la respuesta correcta · «Continuar» pasa al siguiente · el foco queda donde debe.                                                | M    | AC-G4-5, AC-G4-11  |

---

### F3 — Lección completa y jugable

| Tarea | Entrega                                                                                                                                                                                              | Tam. | AC del spec                           |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------- |
| T3.1  | `src/lib/game/random.ts`: `mulberry32` sembrado + mezcla determinista. Tests: misma semilla, mismo resultado.                                                                                        | S    | AC-G2-9                               |
| T3.2  | `buildLesson(pool, mastered, seed)` (§6.3): no dominados primero, mezcla sembrada, pool corto → lección corta. `mastered` llega vacío hasta F5. **Tests primero.**                                   | M    | AC-G2-7, AC-G2-8, AC-G2-9             |
| T3.3  | El reducer completo (§6.2): cola, vidas, reencolado al final, barra que no retrocede, `completed` / `failed`, transición inválida ignorada. **Tests primero**, incluida la cota de que no se cuelga. | L    | AC-G2-2 a AC-G2-6, AC-G2-10, AC-G2-11 |
| T3.4  | `lesson-progress.tsx` (`role="progressbar"`) y `hearts.tsx` (texto para lector, iconos `aria-hidden`).                                                                                               | M    | AC-G4-6                               |
| T3.5  | `lesson-start.tsx`: pantalla de inicio **en el HTML estático** (spec §6.4). La lección se compone al pulsar «Empezar», ya en el cliente.                                                             | M    | AC-G4-3                               |
| T3.6  | `lesson-summary.tsx`: aciertos sobre total, vidas restantes, las palabras falladas con su oración y traducción, «Otra lección», y enlace a `/diccionario/ashaninka?palabra=<id>` de una fallada.     | M    | AC-G4-7, AC-G4-8, AC-G4-17            |
| T3.7  | E2E: lección completa acertando · lección perdida por 3 errores · el ítem fallado reaparece · el enlace al diccionario abre la palabra. Sin `waitForTimeout`: aserts con auto-retry.                 | L    | AC-G4-6, AC-G4-7, AC-G4-8, AC-G4-17   |
| T3.8  | `prefers-reduced-motion`: sin animaciones de acierto ni de error.                                                                                                                                    | S    | —                                     |

> ### ⛔ Checkpoint 2 · hito H2 — jugarlo
>
> `pnpm dev` y jugar varias lecciones enteras. Lo que se decide acá no se decide discutiéndolo:
>
> - ¿`LESSON_SIZE = 10` o 7 (spec, pregunta abierta #3)? ¿`HEARTS = 3` castiga de más a un
>   principiante que aún no distingue las palabras?
> - ¿El vocabulario pedagógico del MINEDU («conclusión», «anécdota», «destinatario») funciona para
>   un aprendiz, o el juego se siente como un examen?
> - ¿La barra avanza de forma que se sienta justa cuando fallas?
>
> Son constantes en `constants.ts`: cambiarlas cuesta una línea. No cambiarlas por no haber jugado
> cuesta el producto.

---

### F4 — Distractores en serio y el guardián del pool

| Tarea | Entrega                                                                                                                                                                                         | Tam. | AC del spec       |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ----------------- |
| T4.1  | Las preferencias de distractor de §5.4: misma `partOfSpeech` → misma cantidad de tokens → relajar en ese orden. El filtro de glosa distinta **nunca** se relaja. Tests del orden de relajación. | M    | AC-G1-4           |
| T4.2  | `scripts/validate-game-items.ts` + `pnpm game:check`: piso de **100 ítems**, ítem sin hueco o con más de uno, distractor igual a la respuesta, `sourceId` ausente. Añadirlo a `check:task`.     | M    | AC-G1-11, AC-G5-3 |
| T4.3  | `--dump`: volcado legible del pool completo, para la revisión humana del checkpoint 3.                                                                                                          | S    | —                 |
| T4.4  | Test contra el diccionario real: el pool da **148** ítems y ≥ 100. Es el único test que toca los datos reales (D7).                                                                             | S    | AC-G1-1           |

> ### ⛔ Checkpoint 3 · hito H1 — puerta humana, la única que queda
>
> `pnpm game:check --dump` y revisión por un hablante o docente asháninka: **¿hay ítems donde un
> distractor también funciona en el hueco?** No lo puede decidir la máquina (spec §5.4, «límite
> honesto»): haría falta un analizador del asháninka que no existe.
>
> Con el contenido cerrado en 148 ítems, esto es un volcado finito y revisable de una sentada.
> **Bloquea la difusión del juego, no el código**: F5 y F6 pueden avanzar mientras se consigue la
> revisión.

---

### F5 — Persistencia en el cliente

| Tarea | Entrega                                                                                                                                                                                                                                      | Tam. | AC del spec                |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | -------------------------- |
| T5.1  | `src/lib/game/progress.ts`: clave versionada, validación de forma, descarte de lo corrupto, y valor neutro explícito si `localStorage` lanza. **Ningún `catch` vacío** (lo bloquea `check:floor`). **Tests primero**, sustituyendo el store. | L    | AC-G3-1 a AC-G3-6, AC-G3-8 |
| T5.2  | `use-progress.ts`: lee **después del montaje**, nunca durante el render. Escribe una vez, al cerrar la lección, no en cada respuesta.                                                                                                        | M    | AC-G3-7                    |
| T5.3  | Conectar: el contador «N lecciones completadas» en la pantalla de inicio, y `mastered` real hacia `buildLesson`. Un id que ya no existe en el pool se ignora, no rompe.                                                                      | M    | AC-G3-9, AC-G4-9           |
| T5.4  | El aviso discreto de «tu progreso no se va a guardar» cuando el almacenamiento no está disponible. Una vez, sin insistir.                                                                                                                    | S    | AC-G4-10                   |
| T5.5  | E2E: el progreso sobrevive a una recarga · **el juego se juega entero con `localStorage` bloqueado** en el contexto del navegador.                                                                                                           | M    | AC-G4-9, AC-G4-10          |

---

### F6 — Uro, entrada desde el home, y cierre

| Tarea | Entrega                                                                                                                                                                                                                     | Tam. | AC del spec         |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------- |
| T6.1  | `unavailable-game.tsx` + la rama de la página para uro (§8.5): dice que está por venir **y por qué**, enlaza `docs/uro-language-sources.md` y el juego asháninka. Sin prometer fecha. Disponibilidad derivada de los datos. | M    | AC-G4-14            |
| T6.2  | `src/components/resources.tsx`: tarjeta «Juegos» → `/juegos/completar-palabras/ashaninka`, y la grilla a `md:grid-cols-3 lg:grid-cols-5`. **Solo eso**; las otras tarjetas se quedan como están.                            | S    | AC-G4-16            |
| T6.3  | Auditoría de accesibilidad del recorrido completo: teclado de punta a punta, contraste, `aria-live`, etiquetas, foco. Lo que aparezca se arregla acá.                                                                       | M    | AC-G4-11 a AC-G4-13 |
| T6.4  | Medir el payload de la ruta en `pnpm build` contra los **50 KB comprimidos** de §5.6. Si se pasa, se recortan campos del ítem — **no** se sube el umbral.                                                                   | S    | —                   |
| T6.5  | `pnpm check:full` en verde. Spec a `implementado`, fila de `specs/README.md` actualizada, y las preguntas abiertas que se hayan cerrado, cerradas.                                                                          | S    | —                   |

---

## 4. Hitos que requieren una persona

| id  | Hito                                                                                                                                | Bloquea                          |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| H1  | **Revisión del pool por un hablante o docente asháninka** (checkpoint 3): ítems donde un distractor también sea válido en el hueco. | La difusión del juego, no F5/F6. |
| H2  | **Jugar y decidir `LESSON_SIZE` y `HEARTS`** (checkpoint 2).                                                                        | Nada. Son constantes.            |
| H3  | **Revisar el copy de la página de uro** (T6.1): el tono importa más que la redacción exacta.                                        | T6.1.                            |

Ninguno depende de un tercero externo. Eso es consecuencia directa de cerrar el contenido: ya no hay
que esperar un permiso de licencia para terminar el trabajo.

---

## 5. Commits

Uno por tarea, [Conventional Commits](https://www.conventionalcommits.org/), sujeto en minúscula e
imperativo. `nvm use` antes de commitear (Node ≥ 22 para el hook de commitlint).

```
F1  feat: add word game item generation
    feat: add word game route
    feat: render a word game item
F2  feat: add immediate feedback to word game
F3  feat: add lesson engine with hearts and progress
    feat: add lesson start and summary screens
F4  feat: refine word game distractor selection
    feat: add word game item validation script
F5  feat: persist word game progress in the browser
F6  feat: explain word game unavailability for uro
    feat: link games card to word game
    docs: mark word game spec as implemented
```

---

## 6. Definición de terminado

Aplica a **cada** tarea, además de sus criterios de aceptación:

- `pnpm check:fast` al editar · `pnpm check:task` al cerrar la tarea (tipos, lint, piso, idioma,
  datos, unit tests, cobertura ≥ 80 % de las líneas tocadas).
- `pnpm test:e2e` pasa (desde T1.5 en adelante).
- `pnpm build` pasa y `/juegos/completar-palabras/[lengua]` sigue saliendo **estática**, no `ƒ`.
- Comportamiento verificado en un navegador real, no solo en tests.
- **Accesibilidad, en cada tarea y no al final:** controles que son `<button>`, foco manejado,
  estado nunca comunicado solo con color, `lang="cni"` en el texto asháninka.
- Todo identificador nuevo en inglés (spec §11).
- Sin `any`, sin `@ts-ignore`, sin `eslint-disable`, sin tests saltados o borrados, sin umbrales
  bajados.
- Cero regresiones en `/`, `/diccionario/[lengua]` y `/lenguas/[slug]`.

---

## 7. Riesgos, ordenados por lo que costaría equivocarse

| Riesgo                                                                      | Impacto | Cuándo se detecta                              | Mitigación                                                                        |
| --------------------------------------------------------------------------- | ------- | ---------------------------------------------- | --------------------------------------------------------------------------------- |
| Un distractor es válido en el hueco y el juego enseña mal                   | Alto    | Solo una persona lo detecta (checkpoint 3)     | Filtro de glosa distinta desde T1.2 · el feedback siempre cita la oración real    |
| El modelo `Item` resulta insuficiente y hay que rehacer el motor encima     | Medio   | Checkpoint 1, con una sola pantalla hecha      | F1 entrega una pantalla antes de que exista el motor                              |
| La lección se mezcla en el servidor → desajuste de hidratación              | Medio   | F3, en `pnpm build` y en E2E                   | Pantalla de inicio estática; la lección se arma al pulsar «Empezar» (spec §6.4)   |
| `localStorage` lanza en modo privado y deja la página en blanco             | Medio   | F5 (T5.5), E2E con el almacenamiento bloqueado | Valor neutro explícito en el códec; ningún `catch` vacío                          |
| Un cambio en el diccionario rompe la coincidencia y el pool cae en silencio | Medio   | T4.2, `game:check` dentro de `check:task`      | Piso de 100 ítems que falla el check                                              |
| La accesibilidad se deja al final y obliga a reescribir la interfaz         | Medio   | Tarde, y por eso está en la DoD                | A11y en la definición de terminado de cada tarea; F6 audita, no descubre          |
| El reencolado se cuelga si un ítem nunca se acierta                         | Bajo    | T3.3, test unitario                            | Cada error cuesta una vida: máximo 3 errores por lección (AC-G2-6)                |
| El payload del pool crece de más                                            | Bajo    | T6.4, tabla de `pnpm build`                    | Umbral de 50 KB comprimidos (spec §5.6); se recortan campos, no se sube el umbral |
| E2E inestables por las animaciones de acierto/error                         | Bajo    | F3-F6                                          | Aserts con auto-retry, nunca `waitForTimeout`                                     |
| El pool de 148 ítems se agota y el juego se siente repetitivo               | Bajo    | En uso                                         | Restricción aceptada (spec, pregunta #4): se repite priorizando lo no dominado    |
