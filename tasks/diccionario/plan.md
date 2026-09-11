# Plan de implementación — Diccionario

> Spec: [specs/diccionario.md](../../specs/diccionario.md) · Fecha: 2026-09-11 · Rama base: `main`
> Lista de tareas ejecutable: [tasks/diccionario/todo.md](./todo.md)

---

## 1. Cómo se corta el trabajo

El mapa `M1..M5` del spec (§3) describe **qué depende de qué**, no en qué orden se escribe el código.
Tomado literalmente sería un plan horizontal: primero toda la capa de datos (incluidas 40 entradas y
el ranking de 5 niveles), luego toda la interfaz. Con eso no habría nada en pantalla hasta muy tarde,
y el modelo de datos se validaría _después_ de haber escrito el contenido.

Este plan corta **vertical**: cada fase termina con una URL que funciona de verdad y con algo más que
antes. Las etiquetas `M1..M5` se conservan en cada tarea para rastrear la trazabilidad con el spec.

```
F0 andamiaje ──> F1 «tres palabras en pantalla» ──> F2 detalle + deep-link
                                                          │
                        F3 orden y agrupado A-Z <──────────┘
                                    │
                        F4 buscador ─┴──> F5 selector de lengua
                                                │
                        F6 validador + API <────┘
                                    │
                        F7 fuentes y contenido real (tiene puerta humana)
                                    │
                        F8 accesibilidad y cierre
```

**Por qué F1 usa 3 entradas y no 40.** El coste de descubrir que a `Entry` le falta un campo es
trivial con 3 entradas y caro con 40. El contenido real crece en F7, cuando el esquema ya está
probado contra una interfaz que lo consume.

**Por qué la API (M2) cae en F6 y no antes.** Nada la consume todavía: la página lee la capa directo
(decisión #3 del spec). Y va **antes** de F7 porque F7 depende de respuestas externas (permisos de
licencia) que pueden tardar semanas y no deben bloquear código que ya se puede escribir.

---

## 2. Decisiones de implementación

Las decisiones de producto están en el spec §2. Aquí solo lo que es puramente de ejecución.

| #   | Decisión                                                                                                                                                                                                                                                                    |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **La página `async` no se testea con Vitest.** La guía de Next lo dice explícitamente: Vitest no soporta Server Components asíncronos. La página y todo lo que la envuelve se verifican con Playwright. Vitest cubre solo `src/lib/` y las funciones `GET` de los handlers. |
| D2  | **Playwright corre contra `next build && next start`**, no contra `next dev`. AC-M3-5 (deep-link con la página prerenderizada + `useSearchParams` en cliente) depende de comportamiento de prerender que en `dev` no es idéntico. Se configura vía `webServer`.             |
| D3  | **`vite-tsconfig-paths` en la config de Vitest** para que el alias `@/` funcione en los tests sin duplicar rutas.                                                                                                                                                           |
| D4  | **Orden de renombrado: no hay renombrado.** Todo nace en inglés desde T1.1 (spec §11.1). No se escribe nada en español para traducirlo después.                                                                                                                             |

---

## 3. Fases

Cada tarea lleva: qué entrega, cómo se verifica, y qué criterios de aceptación del spec cierra.
`S` ≈ menos de media hora · `M` ≈ una a dos horas · `L` ≈ media jornada.

---

### F0 — Andamiaje de pruebas

Necesariamente horizontal: es infraestructura, no producto. Es la única fase que no deja nada visible.

| Tarea | Entrega                                                                                                                                                                     | Tam. | Verificación                               |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------ |
| T0.1  | Vitest: deps, `vitest.config.mts` con `@vitejs/plugin-react` + `vite-tsconfig-paths`, entorno `jsdom`, scripts `test` y `test:watch`. Un test trivial que importa vía `@/`. | S    | `pnpm test` pasa y el alias `@/` resuelve. |
| T0.2  | Playwright: `@playwright/test`, `playwright.config.ts` con `webServer` = `pnpm build && pnpm start` (D2), script `test:e2e`. Smoke test: `/` responde 200.                  | M    | `pnpm test:e2e` pasa con la home actual.   |

**Riesgo:** el `webServer` con `build` completo hace la suite E2E lenta (~1 min de arranque).
Mitigación: `reuseExistingServer: !process.env.CI`.

> ### ⛔ Checkpoint 0 — ¿arranca el andamiaje?
>
> `pnpm test` y `pnpm test:e2e` pasan en verde sobre el código existente, sin haber tocado nada de
> producto. Si algo aquí pelea con Next 16 / React 19, se resuelve **antes** de escribir producto.

---

### F1 — Tres palabras en pantalla (corte vertical mínimo)

Primer recorrido completo: JSON → capa → Server Component → HTML.

| Tarea | Entrega                                                                                                                                                                                                                                                                                         | Tam. | AC del spec                            |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | -------------------------------------- |
| T1.1  | `src/lib/dictionary/types.ts` según §4.1. `registry.ts` con imports estáticos. `getDictionary(language)` → `Dictionary \| null`. Semilla `src/data/dictionary/ashaninka.json` con **3 entradas**, una con ejemplo.                                                                              | M    | AC-M1-9 (parcial)                      |
| T1.2  | `src/app/diccionario/[lengua]/page.tsx`: Server Component, `generateStaticParams()`, `generateMetadata()` → «Diccionario Asháninka», `notFound()` si no hay diccionario. Lista plana, sin orden ni buscador. Redirect `/diccionario` en `next.config.ts`. Desestructurar `lengua` → `language`. | M    | AC-M3-1, AC-M3-10, AC-M3-7 (mitad 404) |
| T1.3  | `src/components/resources.tsx`: `href` de la tarjeta «Diccionario» → `/diccionario/ashaninka`. **Solo ese atributo**; las otras tres tarjetas se quedan con `href="#"`.                                                                                                                         | S    | AC-M3-11                               |
| T1.4  | E2E: `/diccionario` redirige · 3 palabras visibles · `/diccionario/klingon` 404 · `/diccionario/uro` 404 · el `<title>` contiene «Diccionario Asháninka» · el home lleva al diccionario.                                                                                                        | M    | AC-M1-9, AC-M3-1, AC-M3-10, AC-M3-11   |

**Verificación:** `pnpm test:e2e` verde · `pnpm build` muestra `/diccionario/ashaninka` como ruta
estática (`●` o `○` en la tabla de salida, **no** `ƒ`) — si sale dinámica, se ha leído `searchParams`
en el servidor y hay que corregirlo antes de seguir.

> ### ⛔ Checkpoint 1 — validar el modelo de datos contra la realidad
>
> Hay una URL navegable con datos reales, alcanzable desde el home. **Aquí se revisa `Entry` con ojo
> humano antes de escribir 40 entradas.** Preguntas a responder: ¿falta algún campo que el asháninka
> necesite (tono, prefijos, forma poseída)? ¿`translations: string[]` basta o hacen falta acepciones
> numeradas? Cambiar el esquema aquí cuesta minutos; en F7 cuesta reescribir el contenido.

---

### F2 — Detalle y enlace compartible

El requisito central del pedido. Se hace segundo, no último, porque es lo más fácil de romper.

| Tarea | Entrega                                                                                                                                                                                                                                                                                                                                       | Tam. | AC del spec               |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------- |
| T2.1  | `src/lib/dictionary/text.ts`: `normalize` (preserva `ñ`), `slugify`, `compareWords`. Tests unitarios primero, en rojo.                                                                                                                                                                                                                        | M    | AC-M1-1, AC-M1-2          |
| T2.2  | `resolveWord(entries, value)`: por `id`, luego por `word`/variante normalizada. Tests primero.                                                                                                                                                                                                                                                | S    | AC-M1-8                   |
| T2.3  | `components/dictionary/dictionary.tsx` (Client) + `entry-detail.tsx`. Lee `?palabra` con `useSearchParams()`, envuelto en `<Suspense>` desde la página. Clic → `router.push(..., {scroll:false})`; cerrar → `replace`. Ejemplos con `lang="cni"`. Mensaje explícito si no hay ejemplos. Aviso si `?palabra` no resuelve. Botón copiar enlace. | L    | AC-M3-4, AC-M3-6, AC-M3-7 |
| T2.4  | E2E: clic cambia la URL · abrir `?palabra=<id>` en pestaña nueva muestra la entrada ya abierta · `?palabra=basura` avisa y **no** es 404 · «atrás» vuelve a la anterior.                                                                                                                                                                      | M    | AC-M3-5, AC-M3-8          |

**Riesgo:** que `<Suspense>` mal colocado convierta toda la página en cliente, perdiendo el
prerender. **Detección:** el mismo check de `pnpm build` del checkpoint 1 — la ruta debe seguir
saliendo estática.

> ### ⛔ Checkpoint 2 — el pedido central, funcionando
>
> Copiar la URL de una palabra, abrirla en otro navegador y ver esa palabra con su ejemplo de uso.
> Si esto funciona con 3 palabras, funciona con 4 000. Todo lo que viene después es comodidad.

---

### F3 — Orden alfabético y agrupado A-Z

| Tarea | Entrega                                                                                                                                              | Tam. | AC del spec |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ----------- |
| T3.1  | `groupByLetter()` → `{ letter, entries }[]`: sin grupos vacíos, `Á` con `A`, grupo final `#` para dígitos y símbolos. Tests primero.                 | M    | AC-M1-3     |
| T3.2  | `entry-list.tsx`: secciones por letra con encabezado sticky e índice A-Z clicable. Crecer la semilla a **~12 entradas** para que el agrupado se vea. | M    | AC-M3-2     |
| T3.3  | E2E: la lista sale ordenada y agrupada; el índice A-Z salta a la sección.                                                                            | S    | AC-M3-2     |

**Ojo (pregunta abierta #1 del spec, la única que queda):** `compareWords` usa `Intl.Collator("es")`.
Si el asháninka ordena `ch`/`sh`/`ts`/`ky` como letras propias, esto está mal. La función queda
aislada a propósito para poder sustituirla sin tocar la interfaz. **No se cierra sin confirmación de
un hablante o lingüista** — hito H1.

---

### F4 — Buscador

| Tarea | Entrega                                                                                                                                                                                                 | Tam. | AC del spec              |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------ |
| T4.1  | `searchEntries()`: los 5 niveles de ranking del spec §4.4, bidireccional (es→lengua). Tests primero, con fixture diseñado para distinguir los 5 niveles.                                                | L    | AC-M1-4..AC-M1-7         |
| T4.2  | `src/components/ui/input.tsx` vía shadcn (estilo `base-nova`). `search-box.tsx`: debounce ~150 ms, botón limpiar, `<label>` asociado, contador en `aria-live="polite"`. Estado local, **no** en la URL. | M    | AC-M3-3                  |
| T4.3  | E2E: escribir filtra · el contador se actualiza · limpiar restaura · buscar en español encuentra por traducción.                                                                                        | M    | AC-M3-3, AC-M1-6 (en UI) |

**Riesgo:** el debounce y el `aria-live` juntos producen tests E2E inestables (se lee el contador
antes de que se actualice). Mitigación: los aserts esperan el texto final con el auto-retry de
Playwright, nunca con `waitForTimeout`.

> ### ⛔ Checkpoint 3 — la página es usable de verdad
>
> Buscar, ordenar, agrupar, seleccionar y compartir funcionan. Momento natural para mostrárselo a
> alguien ajeno al proyecto antes de invertir en contenido.

---

### F5 — Selector de lengua (M4)

| Tarea | Entrega                                                                                                                                                                                                                                       | Tam. | AC del spec      |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---------------- |
| T5.1  | `getLanguagesWithDictionary()` → `{ slug, name, total }[]`. Tests: incluye `ashaninka`, excluye `uro`.                                                                                                                                        | S    | AC-M1-9          |
| T5.2  | `language-picker.tsx` con `dropdown-menu` (ya existe). Lenguas sin diccionario **deshabilitadas** con etiqueta «pronto». Cambiar navega a `/diccionario/<slug>` descartando `?palabra` y el texto de búsqueda. Muestra lengua activa y total. | M    | AC-M4-1..AC-M4-3 |
| T5.3  | E2E: lengua activa correcta · Uro deshabilitado y no navega · cambiar descarta `?palabra` · navegable con teclado.                                                                                                                            | M    | AC-M4-1..AC-M4-4 |
| T5.4  | Comprobar que el diff no toca `header.tsx`, `layout.tsx` ni `language.tsx`.                                                                                                                                                                   | S    | AC-M4-5          |

---

### F6 — Validador y API (M2)

Todo código, sin dependencias externas. Va antes de F7 justamente por eso.

| Tarea | Entrega                                                                                                                                                                                       | Tam. | AC del spec      |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---------------- |
| T6.1  | `scripts/validate-dictionary.ts` + script `dictionary:check`: `id` único, `id === slugify(word)`, `translations` no vacío, ejemplos completos. Sale con código ≠ 0 y lista errores.           | M    | AC-M1-10         |
| T6.2  | `GET /api/diccionario` (lenguas disponibles) con `dynamic = "force-static"`.                                                                                                                  | S    | AC-M2-1          |
| T6.3  | `GET /api/diccionario/[lengua]` con `q`, `limit` (máx 500), `offset`. Se queda dinámico a propósito. `RouteContext<'/api/diccionario/[lengua]'>`. Params inválidos → `400 invalid_parameter`. | M    | AC-M2-2..AC-M2-5 |
| T6.4  | `GET /api/diccionario/[lengua]/[id]` → entrada o `404 entry_not_found`.                                                                                                                       | S    | AC-M2-6          |
| T6.5  | Tests Vitest de los handlers: invocar las funciones `GET` exportadas con un `Request` construido a mano; comprobar códigos, forma del cuerpo y `405` en `POST`.                               | M    | AC-M2-1..AC-M2-7 |

**Ojo:** los handlers no reimplementan nada. Si un test de API necesita lógica que no está en
`src/lib/dictionary/`, es señal de que se está duplicando y hay que mover la lógica a la capa.

---

### F7 — Fuentes y contenido real (M5)

**Esta fase tiene una puerta humana y puede quedarse esperando semanas.** Está al final por eso, no
por poco importante: sin contenido real el diccionario no sirve a nadie.

| Tarea | Entrega                                                                                                                                                                                                                     | Tam. | AC del spec      |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---------------- |
| T7.1  | `docs/dictionary-sources.md`: fuentes candidatas con institución, URL, licencia declarada, veredicto (`usable`/`requiere-permiso`/`no-usable`), cobertura y calidad ortográfica. **Solo investigación, cero importación.**  | L    | AC-M5-1          |
| T7.2  | **HITO H2 — decisión humana.** Revisar veredictos y decidir qué se usa. Donde haga falta permiso, escribirlo y registrar la respuesta.                                                                                      | —    | AC-M5-2          |
| T7.3  | `src/data/dictionary/sources.json` + atribución visible en la interfaz (lista de fuentes en la página; fuente de la entrada en su detalle).                                                                                 | M    | AC-M5-3, AC-M5-4 |
| T7.4  | `scripts/import-dictionary.ts`: CSV/JSON → esquema M1, corre `dictionary:check`, escribe el JSON. Idempotente.                                                                                                              | L    | AC-M5-5          |
| T7.5  | Crecer `ashaninka.json` a **30–40 entradas**, ≥10 con ejemplos, todas con `sourceId` resoluble.                                                                                                                             | M    | AC-M5-2, AC-M5-3 |
| T7.6  | Medir el payload RSC con contenido real contra el umbral del spec §6.7 (~150 KB comprimidos). Si lo supera: índice ligero en la lista + detalle vía `GET /api/diccionario/[lengua]/[id]`, que es justo lo que F6 construyó. | S    | —                |

> ### ⛔ Checkpoint 4 — contenido real y legalmente limpio
>
> Cada entrada del repo tiene una fuente citada y con licencia registrada. Ninguna palabra, traducción
> u oración fue inventada (spec §13: «Nunca»).

---

### F8 — Accesibilidad y cierre

La accesibilidad se implementa en cada tarea; esta fase la **audita**, que no es lo mismo.

| Tarea | Entrega                                                                                                                                          | Tam. | AC del spec |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---- | ----------- |
| T8.1  | Recorrido completo con teclado, sin ratón: buscar → navegar la lista → abrir detalle → copiar enlace → cambiar lengua. E2E con solo `keyboard`.  | M    | AC-M3-9     |
| T8.2  | Auditar contraste de los pares texto/fondo usados. `#F2B705` sobre claro **no** cumple AA en texto pequeño (spec §6.4): corregir donde aparezca. | M    | AC-M3-9     |
| T8.3  | Responsive: detalle como hoja inferior en móvil (`sheet`, ya existe), dos columnas en escritorio. Verificar a 375 px y a 1280 px.                | M    | —           |
| T8.4  | Actualizar el estado del spec a `implementado` y anotar si la pregunta abierta #1 sigue abierta.                                                 | S    | —           |

---

## 4. Hitos que requieren una persona

Ni la IA ni los tests pueden cerrar estos.

| id  | Hito                                                                                                    | Bloquea                                          |
| --- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| H1  | **Confirmar el orden alfabético asháninka** con un hablante o lingüista (dígrafos `ch`/`sh`/`ts`/`ky`). | Cerrar F3 como correcta. No bloquea escribir F3. |
| H2  | **Aprobar licencias de fuentes** y conseguir permisos donde haga falta (T7.2).                          | T7.3 en adelante.                                |
| H3  | **Revisar el esquema `Entry`** en el checkpoint 1, antes de escribir contenido en volumen.              | F7.                                              |

---

## 5. Commits

Un commit por tarea, [Conventional Commits](https://www.conventionalcommits.org/), sujeto en minúscula
e imperativo. `nvm use` antes de commitear (Node ≥ 22 para el hook de commitlint).

```
F0  chore: set up vitest for unit tests
    chore: set up playwright for e2e tests
F1  feat: add dictionary data layer and types
    feat: add dictionary page route
    feat: link dictionary card to dictionary page
F2  feat: add text normalization and word resolution
    feat: add entry detail with shareable word links
F3  feat: group dictionary entries alphabetically
F4  feat: add dictionary word search
F5  feat: add language picker to dictionary
F6  feat: add dictionary validation script
    feat: add dictionary api route handlers
F7  docs: add dictionary source and license research
    feat: add source attribution to dictionary
    feat: add dictionary import script
F8  fix: meet contrast requirements in dictionary
    docs: mark dictionary spec as implemented
```

---

## 6. Definición de terminado

Aplica a **cada** tarea, además de sus criterios de aceptación:

- `pnpm test` pasa · `pnpm lint` sin avisos · `pnpm format:check` limpio · `pnpm build` pasa.
- `pnpm test:e2e` pasa (desde F1 en adelante).
- Comportamiento verificado en un navegador real, no solo en tests.
- `/diccionario/[lengua]` sigue saliendo **estática** en la tabla de `pnpm build`.
- Todo identificador nuevo en inglés (spec §11.1).
- Sin `any`, sin `@ts-ignore`, sin `eslint-disable`, sin tests saltados o borrados.
- Cero regresiones en `/`, `/ashaninka` y `/lenguas/[slug]`.

---

## 7. Riesgos, ordenados por lo que costaría equivocarse

| Riesgo                                                          | Impacto | Cuándo se detecta                                      | Mitigación                                                                |
| --------------------------------------------------------------- | ------- | ------------------------------------------------------ | ------------------------------------------------------------------------- |
| El orden alfabético del español es incorrecto para el asháninka | Alto    | Solo lo detecta una persona (H1)                       | `compareWords` aislada y sustituible sin tocar la interfaz                |
| Las fuentes con copyright bloquean el contenido                 | Alto    | T7.1                                                   | F7 al final; el producto funciona con semilla propia mientras se resuelve |
| `useSearchParams` mal envuelto convierte la página en dinámica  | Medio   | Cada `pnpm build` (está en la definición de terminado) | Checkpoint explícito en F1 y F2                                           |
| El esquema `Entry` resulta insuficiente para el asháninka       | Medio   | Checkpoint 1 (H3), con solo 3 entradas escritas        | Contenido en volumen recién en F7                                         |
| Vitest / Playwright pelean con Next 16 + React 19               | Medio   | Checkpoint 0                                           | F0 va primero, aislada, sin producto de por medio                         |
| El payload RSC crece de más al pasar `entries` como props       | Bajo    | T7.6, con contenido real                               | Umbral medible en spec §6.7; la salida ya está construida (API de F6)     |
| Tests E2E inestables por el debounce del buscador               | Bajo    | F4                                                     | Aserts con auto-retry, nunca `waitForTimeout`                             |
