# Saltapalabras

> Estado: **borrador** · Fecha: 2026-11-17 (revisado el mismo día, el 2026-11-20 y el 2026-11-21, ver «Cambios del …») ·
> Rama: `worktree-saltapalabras-spec`
> Rama base: `main` · Plan: [tasks/saltapalabras/](../tasks/saltapalabras/plan.md) · Índice:
> [specs/README.md](./README.md)
> Referencia de diseño: [docs/saltapalabras-referencia.md](../docs/saltapalabras-referencia.md), el
> prototipo en `index.html` + Supabase que originó la idea. **Es referencia, no contrato:** donde
> difiere de este spec, manda este spec (§2 explica cada diferencia).
> Depende de: [specs/diccionario.md](./diccionario.md) (fuente citada del primer paquete), del
> proyecto de Supabase de [specs/solicitudes.md](./solicitudes.md) (mismo proyecto, otras tablas) y
> del acceso `/admin` con Basic Auth de [specs/edicion-fotos.md](./edicion-fotos.md) (se reusa, §8).

### Cambios del 2026-11-17

La persona del proyecto revisó el primer borrador y decidió, para un proyecto de **pocos meses con
edición esporádica**:

| Qué cambió                                                                                                                                                                         | Por qué                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Solo el servidor de Next habla con Supabase** (`service_role`, patrón de `solicitudes`). Sin clave pública, sin cliente de navegador, sin RLS por rol. Reemplaza la decisión #3. | Una sola forma de acceder a la base, ya probada en el repo. La seguridad se reduce a «la base no se abre a nadie más que al servidor».          |
| **Los paquetes se leen en el servidor y quedan en caché.** Si Supabase falla o se pausa, se sigue sirviendo el último paquete bueno. Reemplaza #7 y #8 en lo que tocan.            | El plan gratis de Supabase pausa el proyecto tras 7 días sin actividad; antes, eso dejaba el juego sin contenido.                               |
| **El juego es libre de login**, en todas sus rutas. «Probar mi borrador» sale de la página pública.                                                                                | Confirmado por la persona del proyecto: quien juega nunca ve un ingreso.                                                                        |
| **Acceso interno = el `/admin` con Basic Auth de `edicion-fotos.md`.** Fuera Supabase Auth, enlace mágico, `profiles` y roles. Reemplaza SP5.                                      | Un solo acceso para todo lo interno, sin correos (el SMTP de Supabase solo envía a miembros del equipo, 2 por hora) ni cuentas que administrar. |
| **Edición en `/admin/juego`:** importar el JSON de un paquete, probarlo, publicarlo, ver historial, restaurar y subir audio por ítem. Reemplaza SP6.                               | Edición esporádica: no justifica un editor web.                                                                                                 |
| **Audio en Supabase Storage**, bucket público `audio`; el navegador del jugador lo descarga directo de la URL pública. La subida pasa por el servidor.                             | Decisión de la persona del proyecto: el archivo no pasa por Vercel al reproducirse.                                                             |
| **Descartados** el editor web, las propuestas con diff y roles, y la grabación en el navegador (§12).                                                                              | Mismo motivo: pocos meses, edición esporádica. Se conservan descritos para retomarlos.                                                          |

### Cambios del 2026-11-20

Tras publicar el primer paquete, la persona del proyecto pidió **poder corregirlo desde la página**,
sin descargar ni editar JSON. Se agrega un **editor mínimo** (SP6b, §9.5) sobre el paquete en
preparación que ya existía (vive solo en el navegador):

| Qué cambió                                                                                                                                                      | Por qué                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **SP6b: editar palabras en `/admin/juego`** (emoji, traducción, verificada; corregir la palabra; agregar y quitar de un tema; «Marcar todas como verificadas»). | Un editor no técnico no debe tocar JSON para cambiar un emoji o desmarcar una palabra.                                    |
| **No se recupera** lo demás del editor web descartado: borradores en la nube, propuestas, diff, roles.                                                          | Sigue siendo un proyecto de pocos meses: el paquete en preparación vive en el navegador y se publica con el flujo de SP6. |
| §9.3: la verificación también se marca en el editor, no solo en el JSON.                                                                                        | Consecuencia directa de SP6b.                                                                                             |

### Cambios del 2026-11-20 (plataformas)

La persona del proyecto pidió que el juego sea el **juego de plataformas 2D de desplazamiento
lateral** del prototipo original, con sonido. Su descripción está en
[docs/saltapalabras-referencia.md §10](../docs/saltapalabras-referencia.md) (referencia, no
contrato). Se agrega la capacidad **SP4b `platformer`** (§7.6), que reemplaza la ronda con
plataformas fijas de §7.2:

| Qué cambió                                                                                                                                                                                                            | Por qué                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Nivel de plataformas:** Pip corre de izquierda a derecha, salta y toca con la cabeza la nube con la respuesta; la correcta abre la **puerta de madera** del reto; al final, la meta con trofeo y resumen.           | Pedido de la persona del proyecto: es el juego que originó la idea.                                         |
| **Fallar ya no reencola** (reemplaza #11 en el juego): la nube queda tachada y se prueba otra en el mismo reto. Con tres nubes, el reto siempre se resuelve.                                                          | Así lo hace el juego de referencia; el reto no termina sin la respuesta correcta, y nadie se queda trabado. |
| **Puntos** (+10 a la primera, +5 tras fallar). **Vidas, caracoles, huecos, plataformas, personajes y ajustes por partida** llegan en fases siguientes (F5b, F5c).                                                     | Corte vertical: primero un nivel jugable de punta a punta.                                                  |
| **Efectos de sonido** generados en código (Web Audio), con botón de silencio.                                                                                                                                         | «Con sonido», sin archivos ni dependencias, y sin voz sintética.                                            |
| **El canvas pasa a ser el campo de juego** (reemplaza #10 en lo que toca), pero **los botones siguen siendo controles reales**: el juego se juega entero con 1/2/3 o con un lector de pantalla, sin precisión motora. | Accesibilidad obligatoria (§7.3): un juego de saltos no puede dejar fuera a quien no puede saltar a tiempo. |

**Diferencias con la referencia que se mantienen a propósito** (manda esta spec):

| La referencia dice                                                            | Aquí                                                                                                                                                      |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Voz del navegador (`language.tts`, calidad «approx»).                         | **Sin voz sintética** (#6). El 🔊 reproduce solo la grabación del ítem; sin grabación, no hay botón. «Decir la palabra al acercarse», solo con grabación. |
| Cuentas, progreso en la nube, borradores, propuestas, edición por cualquiera. | **Sin login** (#16, #18). Progreso y ajustes solo en el navegador; la edición es `/admin/juego`.                                                          |
| Esquema `pip-lang-pack/1` (`language.code`, `source`, `tts`).                 | Esquema propio `language-pack/1` (§4.1). Lo que falte se agrega a este esquema con su validación.                                                         |
| Paquetes preparados con IA como borrador.                                     | Nunca se generan palabras con IA (§13).                                                                                                                   |
| Se juegan ítems `verified: false` hasta que un hablante los revise.           | Solo ítems verificados (#4, `playableThemes`).                                                                                                            |
| Solo teclado de movimiento o botones táctiles.                                | Además, las opciones como `<button>` y teclas 1/2/3, que hacen saltar a Pip a esa nube (§7.6).                                                            |
| Estética de los clásicos de 8 y 16 bits.                                      | Arte original dibujado en código; nada que imite a un juego concreto (ni sus personajes, objetos, paleta o tipografía).                                   |

### Cambios del 2026-11-21

La persona del proyecto probó el nivel de plataformas y decidió: **«las palabras deben sonar»**. Hoy
no hay grabaciones de hablantes (F3 no tiene contenido), así que sin voz el juego quedaba mudo. Se
agrega la capacidad **SP4c `speech`** (§7.7):

| Qué cambió                                                                                                                                                                                                                                                                 | Por qué                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Reescribe #6.** La **grabación** del ítem (`item.audio`) suena siempre que exista. Si no hay, se usa la **voz del navegador** (`speechSynthesis`, voz `es-PE` o cualquier `es-*`) **como provisional**, con un aviso visible y un interruptor «Voz aproximada: sí / no». | Decisión de la persona del proyecto. El riesgo (pronunciación castellana de una lengua originaria) se hace visible, no se esconde. |
| **La palabra suena** al acercarse Pip a las nubes (una vez por reto, con ajuste «Decir la palabra al acercarse»), al acertar y con 🔊, que ahora está siempre en la barra de pista.                                                                                        | Así lo describe el juego de referencia (§10 de la referencia).                                                                     |
| **`language.tts` opcional en el paquete** (`lang`, `quality: "approx" \| "off"`, `replace`): `off` apaga la voz sintética para una lengua. Sin el bloque: `approx` con `es-PE`.                                                                                            | Una lengua con hablantes que pidan no usar la voz aproximada la puede apagar sin tocar código.                                     |
| **Pasos al caminar:** un efecto corto de Web Audio mientras Pip corre por el suelo.                                                                                                                                                                                        | «Cuando camina no suena»: el nivel se sentía mudo.                                                                                 |
| La ruta definitiva **sigue siendo F3** (grabaciones de hablantes): en cuanto un ítem tiene `audio`, la voz aproximada deja de usarse para él.                                                                                                                              | La voz del navegador es un parche hasta tener grabaciones, no la meta.                                                             |

La fila «Voz del navegador» de la tabla de diferencias de arriba queda así: la referencia usaba la voz
del navegador como única voz; aquí es **provisional**, detrás de la grabación, con aviso e
interruptor.

### Cambios del 2026-11-23 (gestor-lenguas F4)

Nota, no reescritura: el detalle está en [gestor-lenguas.md](./gestor-lenguas.md) §9.

- Saltapalabras lee **solo el paquete de lengua** (`language_bundles`, o el del repo en
  `src/data/bundles/`). `language_packs` y `pack_versions` dejan de leerse; `/admin/juego` se
  retiró y el contenido se edita en `/admin/lenguas`. Copia de lo publicado y paso a solo lectura:
  [docs/gestor-lenguas-migracion.sql](../docs/gestor-lenguas-migracion.sql).
- Se retiraron `pnpm pack:draft`, `src/data/word-jump/ashaninka-pictures.json` (los dibujos van en
  las entradas del paquete) y la comprobación de disponibilidad por lengua: una lengua sin paquete
  dice «Todavía no hay contenido publicado».
- Se retiró el reducer de §5.4 (`createRound`, `answerQuestion`, `nextQuestion`, `roundOutcomes`,
  `MAX_REQUEUES`), que la decisión #22 ya había dejado sin uso: la ronda la juega el nivel de
  plataformas. AC-SP2-6 y AC-SP2-7 quedan sin código que probar; `buildRound` (§5.3) sigue.

---

## 1. Objetivo

Un juego de vocabulario **para todas las edades**, con un personaje que salta hacia la respuesta
correcta, y con cinco tipos de ronda: dibujo → palabra, escuchar → palabra, palabra → dibujo, letra
inicial y vocal que falta. El contenido de cada lengua es un **paquete** (un JSON versionado) que el
equipo arma fuera del sitio y publica desde `/admin/juego`.

El juego de [completar-palabras](./completar-palabras.md) enseña vocabulario en contexto para quien
ya lee. Saltapalabras apunta a quien empieza, también a niñas y niños: dibujos, sonido, letras.

Tiene dos caras: el **juego**, público y **sin login de ningún tipo**, y la **administración de
paquetes** (`/admin/juego`), de **uso interno** para el equipo, todas personas adultas, detrás del
mismo Basic Auth que el resto de `/admin` (decisión #16).

**Usuarios objetivo**

| Usuario                                  | Lado    | Necesidad principal                                                                             |
| ---------------------------------------- | ------- | ----------------------------------------------------------------------------------------------- |
| Niña/o o principiante                    | Público | Jugar sin leer mucho ni registrarse: dibujos, sonido, botones grandes.                          |
| Hablante o docente (adulto)              | Externo | Aportar palabras, traducciones y grabaciones; se las hace llegar al equipo (no entra al sitio). |
| Persona del equipo con acceso a `/admin` | Interno | Importar un paquete, verificar que es correcto, probarlo, publicarlo y adjuntar los audios.     |

**Qué NO es este trabajo**

- Quien juega **nunca** inicia sesión ni crea cuenta. Ninguna ruta pública del juego pide, ofrece ni
  enlaza un ingreso. Su progreso vive solo en su navegador.
- No genera contenido con IA, ni tiene un botón para hacerlo. La voz sintética del navegador es solo
  provisional, detrás de la grabación, con aviso e interruptor (decisión #6, reescrita el
  2026-11-21).
- No muestra a quien juega ninguna palabra sin verificar (decisión #4).
- No reemplaza al diccionario ni al juego de completar palabras, y no los modifica.
- No hay racha, XP, logros, tabla de posiciones ni nada social entre usuarios.
- No hay editor web completo de paquetes, propuestas, roles ni grabación en el navegador
  (descartados, §12). Sí hay un **editor mínimo** de palabras en `/admin/juego` (SP6b, §9.5).
- No hay cuentas individuales para el equipo: un usuario y contraseña compartidos (Basic Auth).
- No hay Realtime: un paquete nuevo se ve en la siguiente carga tras publicar (decisión #9).

---

## 2. Decisiones tomadas

Las decisiones 1, 2, 4 y la 16 las cerró la persona del proyecto el 2026-11-17; la 3, la 7, la 8 y
la 17 a 20 se rehicieron el mismo día (ver «Cambios del 2026-11-17»). El resto se deriva de ellas y
del repo, y se puede discutir en la revisión de este spec.

| #   | Decisión                                          | Elección                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Stack**                                         | **Next.js**, dentro de este repo y con [CONSTRAINTS.md](../CONSTRAINTS.md). Lógica en `src/lib/`, UI en componentes TS. Nada del `index.html` de referencia se copia: se reimplementa.                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2   | **Alcance**                                       | Juego completo con sus cinco modos, administración mínima de paquetes y audio. Un solo spec con mapa de capacidades (§3) y orden vertical: primero se juega, después se administra.                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 3   | **Supabase, solo desde el servidor**              | **El mismo proyecto que `solicitudes`**, con el **mismo patrón**: solo el servidor de Next habla con la base, con la `service_role` (`src/lib/supabase-admin.ts`). El navegador **nunca** habla con Supabase para leer o escribir datos. Tablas con RLS activado **sin políticas**, `revoke all` y `grant` mínimo a `service_role`. `solicitudes` no se toca.                                                                                                                                                                                                                                                       |
| 4   | **Solo contenido verificado**                     | El juego **solo muestra ítems con `verified: true`**. Lo no verificado puede estar en un paquete importado, pero nunca llega a quien juega. Lo marca la persona del equipo que lo comprobó con un hablante o con la fuente (§9.3).                                                                                                                                                                                                                                                                                                                                                                                  |
| 5   | **Lenguas**                                       | Un paquete existe solo para una lengua de `src/lib/languages.ts`. **Aimara** se agrega allí cuando haya una fuente citada (§14, pregunta 1). **Uro** queda sin paquete: no tiene hablantes ni alfabeto oficial ([docs/uro-language-sources.md](../docs/uro-language-sources.md)).                                                                                                                                                                                                                                                                                                                                   |
| 6   | **Grabación primero; voz aproximada provisional** | _(Reescrita el 2026-11-21 por la persona del proyecto: «las palabras deben sonar».)_ Si el ítem tiene `audio` (grabación de hablante), suena la grabación, siempre. Si no, la voz del navegador (`speechSynthesis`, voz `es-PE` o `es-*`) **como provisional**, con aviso visible «Pronunciación aproximada» e interruptor «Voz aproximada: sí / no» (§7.7). `language.tts.quality = "off"` la apaga para una lengua. Antes decía «sin voz sintética»: el riesgo de enseñar una pronunciación castellana sigue en pie, por eso el aviso; la meta sigue siendo F3. La ronda «escuchar» solo usa ítems con grabación. |
| 7   | **Sin paquete incluido en el código**             | No hay contenido de lengua en el bundle. Si **nunca** se pudo leer un paquete (por ejemplo, sin variables de entorno), la página dice que el juego no está disponible y ofrece el otro juego. Si se leyó alguna vez, se sigue sirviendo el último paquete bueno aunque Supabase falle (#8). Un respaldo inventado sería peor que no tener juego.                                                                                                                                                                                                                                                                    |
| 8   | **Lectura en el servidor, con caché**             | El paquete publicado se lee en el servidor con `unstable_cache` (etiqueta `word-jump-pack:<lengua>`, `revalidate: 3600`). La página del juego se genera en la **primera visita** y queda en caché (ISR): **el build no llama a Supabase**. Si una revalidación falla, Next sigue sirviendo lo último que se generó bien. Detalle en §6.4.                                                                                                                                                                                                                                                                           |
| 9   | **Sin Realtime**                                  | Cambiar el paquete a mitad de una ronda rompe la ronda. Un paquete publicado se ve en la siguiente carga de la página.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 10  | **Canvas decorativo, controles reales**           | El salto se dibuja en un `<canvas>` con `aria-hidden`. Las opciones son `<button>` reales. El juego se puede jugar entero sin ver el canvas, con teclado y con lector de pantalla.                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 11  | **Sin vidas**                                     | Es un juego para todas las edades: fallar no termina la ronda. El ítem fallado vuelve al final de la cola, **como máximo dos veces**. A la tercera se muestra la respuesta y se sigue. Así la ronda siempre termina (§5.4).                                                                                                                                                                                                                                                                                                                                                                                         |
| 12  | **Paquete en `jsonb`**                            | Igual que la referencia: el paquete es la unidad que se importa, versiona, exporta y valida. Una vista `pack_words` cubre las consultas por palabra.                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 13  | **Nombres**                                       | La URL pública es `/juegos/saltapalabras/…` y la interna `/admin/juego` (español). En el código el juego se llama `word-jump` (`check:language` marca «palabra»). Tablas, columnas y claves JSON en inglés.                                                                                                                                                                                                                                                                                                                                                                                                         |
| 14  | **Sin dependencias nuevas**                       | `@supabase/supabase-js` y `zod` ya están. Sin motor de juegos, sin `@supabase/ssr`, sin librería de auth: el acceso interno es el Basic Auth de `edicion-fotos.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 15  | **Publicar sin pisar a nadie**                    | Concurrencia optimista por versión: publicar dice qué versión esperaba encontrar; si alguien publicó antes, no se pisa y se avisa (§6.2).                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 16  | **Cuentas: ninguna**                              | Quien juega no tiene cuenta ni login. El acceso interno no son cuentas sino el usuario y contraseña compartidos de `/admin`, que solo se entregan a **personas adultas del equipo**. No hay datos de menores ni de nadie más.                                                                                                                                                                                                                                                                                                                                                                                       |
| 17  | **Acceso interno = `/admin` (Basic Auth)**        | Se reusa sin cambios el acceso de [edicion-fotos.md](./edicion-fotos.md): mismo `src/proxy.ts` (`/admin/:path*`, `/api/admin/:path*`), mismas `ADMIN_USER` / `ADMIN_PASSWORD`, mismo `src/lib/admin/basic-auth.ts`, y cada Route Handler vuelve a comprobar las credenciales. Quien llegue primero al código lo crea; el otro lo reusa.                                                                                                                                                                                                                                                                             |
| 18  | **Juego libre de login**                          | Ninguna ruta de `/juegos/saltapalabras/**` responde 401, muestra un formulario de ingreso ni enlaza a `/admin`. La vista previa de un paquete sin publicar vive **solo** dentro de `/admin/juego`.                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 19  | **Audio público en Supabase Storage**             | Bucket público `audio`. El navegador del jugador descarga cada archivo **directo de la URL pública de Supabase** al pulsar el botón de sonido (`preload="none"`). La subida la hace el servidor desde `/admin/juego`; el navegador nunca escribe en el bucket.                                                                                                                                                                                                                                                                                                                                                      |
| 20  | **Publicar con una función SQL**                  | Publicar escribe dos cosas a la vez: la versión nueva en `language_packs` y su fila en `pack_versions`. `supabase-js` no tiene transacciones, así que una función SQL `publish_language_pack` (ejecutable **solo** por `service_role`) hace las dos escrituras y la comprobación de versión en una sola transacción. Es lo más simple que es atómico.                                                                                                                                                                                                                                                               |
| 21  | **Juego de plataformas** (2026-11-20)             | Un nivel por partida: un reto por palabra, cada reto con sus nubes de respuesta y una puerta de madera que solo se abre al acertar; meta con resumen al final. La lógica (física, choques, estado del nivel, puntos, trazado con semilla) es pura en `src/lib/word-jump/platformer/`; el canvas solo dibuja. Detalle en §7.6.                                                                                                                                                                                                                                                                                       |
| 22  | **Fallar tacha la nube** (2026-11-20)             | En el juego, una respuesta incorrecta tacha esa nube y el reto sigue; la palabra cuenta como fallada para el progreso. Reemplaza el reencolado de #11 **en el juego**; `round.ts` conserva su reducer, que ya no usa la página.                                                                                                                                                                                                                                                                                                                                                                                     |
| 23  | **Sonido sin voz** (2026-11-20)                   | Efectos de sonido con Web Audio, creados en código al primer gesto de la persona, silenciables (`settings.sound`). El 🔊 de la pista reproduce **solo** `item.audio` (#6, #19).                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 24  | **Arte original** (2026-11-20)                    | Pip (un zorrito) y todo lo demás se dibujan con formas en el canvas. Ningún recurso, personaje, objeto, paleta ni tipografía de otro juego.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 25  | **El canvas no es la única vía** (2026-11-20)     | Cada opción es también un `<button>` (y tecla 1/2/3) que hace saltar a Pip a esa nube y responde. Pista, opciones, resultado y resumen están en el DOM. Con `prefers-reduced-motion`, sin animación de salto ni de puerta.                                                                                                                                                                                                                                                                                                                                                                                          |

---

## 3. Mapa de capacidades

Seis capacidades vigentes, verificables por separado. Las flechas son dependencia. El orden de
tareas lo fija el plan, cortando vertical. SP7 (propuestas) quedó descartada (§12).

```
SP1 pack-format ──┬──> SP2 round-engine ──┐
                  │                       ├──> SP4 game-page ──────────────┐
                  └──> SP3 pack-library ──┴──────────────> SP6 pack-admin ─┴──> SP8 audio
                                           SP5 admin-access ─┘        │
                                                                      └──> SP6b pack-editor
```

| id   | Módulo         | Entrega                                                                                                  | Depende de    | Verificable por                         |
| ---- | -------------- | -------------------------------------------------------------------------------------------------------- | ------------- | --------------------------------------- |
| SP1  | `pack-format`  | Tipos y esquema Zod del paquete, `cleanPack`, `validatePack`, `playableThemes`.                          | —             | Vitest                                  |
| SP2  | `round-engine` | Generación de preguntas por modo, distractores, reducer de la ronda, estadísticas por ítem.              | SP1           | Vitest                                  |
| SP3  | `pack-library` | Tablas `language_packs` y `pack_versions`, función de publicación, lectura cacheada en el servidor.      | SP1           | Pruebas SQL + Vitest (cliente simulado) |
| SP4  | `game-page`    | Rutas públicas, canvas, controles, accesibilidad, progreso local. Sin login.                             | SP1, SP2, SP3 | Playwright                              |
| SP4b | `platformer`   | El nivel de plataformas (§7.6): física, nubes, puerta, meta, puntos, sonido; luego obstáculos y ajustes. | SP2, SP4      | Vitest (lógica pura) + Playwright       |
| SP5  | `admin-access` | El Basic Auth de `/admin` de `edicion-fotos.md` (E1). Si ya existe, esta capacidad es solo reusarlo.     | —             | Vitest + Playwright                     |
| SP6  | `pack-admin`   | `/admin/juego`: importar, validar, probar, publicar, exportar, historial y restaurar.                    | SP1, SP3, SP5 | Vitest + Playwright                     |
| SP6b | `pack-editor`  | Editor mínimo en `/admin/juego`: emoji, traducción, verificada, palabra, agregar y quitar (§9.5).        | SP6           | Vitest + Playwright                     |
| SP8  | `audio`        | Subir audio por ítem desde `/admin/juego`, bucket público, reproducir y activar la ronda «escuchar».     | SP4, SP6      | Vitest + Playwright + SQL               |

**Fases verticales** (cada una termina con algo usable de punta a punta):

| Fase | Capacidades | Qué se puede hacer al cerrar                                                                                      |
| ---- | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| F1   | SP1–SP4     | Jugar sin login un paquete publicado (cargado con la función SQL desde el SQL Editor por el equipo).              |
| F2   | SP5–SP6     | Una persona del equipo entra a `/admin/juego`, importa un paquete, lo prueba y lo publica; el juego lo muestra.   |
| F2b  | SP6b        | Corregir el paquete publicado desde `/admin/juego` (sin JSON) y publicarlo como versión nueva.                    |
| F3   | SP8         | Adjuntar grabaciones a los ítems desde `/admin/juego` y jugar «escuchar».                                         |
| F5a  | SP4b        | Un nivel de plataformas de punta a punta: pista → correr → saltar a la nube → la puerta se abre → meta y resumen. |
| F5b  | SP4b        | Obstáculos: huecos, plataformas elevadas, caracoles; vidas (corazones) y +2 por caracol.                          |
| F5c  | SP4b        | Ajustes por partida (Principiante / Intermedio / Avanzado) y personajes a elegir.                                 |

---

## 4. SP1 — `pack-format`

### 4.1 Modelo

`src/lib/language-packs/types.ts`. Se diferencia de la referencia en: `language.slug` en vez de
`code` (es la clave de `languages.ts`), `isoCode` aparte (para `lang=""`), `sources[]` con ids
(cada ítem cita), `id` estable por ítem, y sin `tts`.

```ts
export const PACK_SCHEMA = "language-pack/1";

export type GameMode = "pic2word" | "listen" | "word2pic" | "first" | "vowel";

export type LanguagePack = {
  schema: typeof PACK_SCHEMA;
  language: {
    /** Key in src/lib/languages.ts and primary key in the database. */
    slug: string;
    /** ISO 639-3, for the `lang` attribute (`cni`, `aym`). */
    isoCode: string;
    name: string;
    title: string;
    about?: {
      region?: string;
      family?: string;
      speakers?: string;
      notes?: string;
    };
    /** Used by the `vowel` mode. */
    vowels: string[];
    /** Accented or variant spellings folded onto a vowel: { "á": "a" }. */
    vowelVariants?: Record<string, string>;
    /** Longest-match tokenisation for the `first` mode; digraphs included. */
    graphemes: string[];
    /** Preferred distractors for a grapheme: { "ts": ["ch", "s"] }. */
    confusable?: Record<string, string[]>;
    /** Label for the translation language, e.g. "castellano". */
    translationLabel: string;
    /** Short phrases in the language, reviewed as part of publishing. */
    praise?: { correct?: string; wrong?: string; win?: string };
    /**
     * The browser voice used while an item has no recording (decision #6,
     * 2026-11-21). Absent: { lang: "es-PE", quality: "approx" }.
     */
    tts?: {
      /** BCP 47 tag of the voice to ask the browser for: "es-PE". */
      lang: string;
      /** "off" never speaks with a synthetic voice for this language. */
      quality: "approx" | "off";
      /** Text replacements applied before speaking: [["'", ""]]. */
      replace?: [string, string][];
    };
  };
  sources: PackSource[];
  themes: Theme[];
};

export type PackSource = {
  id: string;
  kind: "publication" | "speaker";
  /** A publication title, or how a consenting speaker wants to be credited. */
  title: string;
  url?: string;
  note?: string;
};

export type Theme = {
  id: string;
  name: string;
  nameNative?: string;
  icon: string;
  mode: GameMode;
  items: PackItem[];
};

export type PackItem = {
  /** Stable across edits, so progress survives a corrected spelling. */
  id: string;
  word: string;
  translation: string;
  emoji?: string;
  /** Must resolve to `sources[].id` for the item to be playable. */
  sourceId?: string;
  /** Page or entry inside the source: "p. 112". */
  sourceRef?: string;
  /** Set by the team member who checked it. Unverified items are never played (decision #4). */
  verified: boolean;
  /** Public URL inside the project's `audio` bucket. Never a data: URI. */
  audio?: string;
};
```

### 4.2 Funciones

Todas puras, sin React ni `window`, en `src/lib/language-packs/`.

- **`parsePack(input: unknown): Result<LanguagePack>`** — Zod. Todo lo que llega de la base, de un
  archivo importado o de `localStorage` pasa por aquí. Lo que no valida se rechaza entero; no se
  repara a medias.
- **`cleanPack(pack): LanguagePack`** — recorta espacios, quita ítems sin `word` ni `translation`,
  **asigna `id` a los ítems que no lo tienen y nunca cambia uno existente**, deduplica ids repetidos.
  Normaliza a Unicode NFC (las tildes compuestas y descompuestas son la misma palabra).
- **`validatePack(pack, { audioBaseUrl }): { errors: Issue[]; warnings: Issue[] }`** — reglas de
  §4.3. `audioBaseUrl` es la URL pública del bucket `audio` del proyecto; se recibe por argumento
  para que la función siga siendo pura. Cada `Issue` lleva `themeId`, `itemId` si aplica, un `code`
  en inglés y un `message` en español.
- **`playableThemes(pack): Theme[]`** — el filtro que usa el juego. Deja en cada tema solo los ítems
  `verified` con `sourceId` que resuelve, y quita los temas que así no alcanzan el mínimo de su modo.
  **Es la única puerta entre el paquete y quien juega.**
- **`tokenizeGraphemes(word, graphemes): string[]`** — coincidencia más larga primero (`ts` antes que
  `t`), con lo que no está en la lista como token de un carácter.

### 4.3 Reglas de validación

**Errores** (bloquean publicar):

- `language.slug` no está en `languages.ts`, o no coincide con la lengua elegida en `/admin/juego`.
- Un `sourceId` que no existe en `sources`.
- `audio` que no empieza por `audioBaseUrl` (URL `https` del bucket `audio` del proyecto).
- Dos ítems del mismo tema con la misma `word` normalizada.
- El paquete serializado pesa 2 MB o más.
- `language.tts` con `lang` vacío o que no es una etiqueta de idioma (`es`, `es-PE`), `quality`
  distinto de `approx` u `off`, o un `replace` cuyo texto a buscar está vacío (2026-11-21).

**Mínimos por modo**, contados sobre los ítems **verificados** (si no se cumplen, el tema es un
aviso en `/admin/juego` y no aparece al jugar):

| Modo       | La pregunta muestra                                            | Opciones          | Mínimo para jugar                                                                                       |
| ---------- | -------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------- |
| `pic2word` | emoji                                                          | 3 palabras        | 3 ítems con emoji y palabras distintas                                                                  |
| `listen`   | botón de audio                                                 | 3 palabras        | 3 ítems **con audio** y palabras distintas                                                              |
| `word2pic` | palabra (+ audio si hay)                                       | 3 emojis          | 3 ítems con emojis distintos                                                                            |
| `first`    | emoji (o su significado, si no tiene) + palabra sin su inicial | 3 grafemas        | 1 ítem cuya inicial esté en `graphemes`, y 3 grafemas en la lengua. Sin emoji no hay aviso (2026-11-20) |
| `vowel`    | palabra con una vocal tapada                                   | las vocales (≤ 4) | 1 ítem con al menos una vocal de `vowels` (tras `vowelVariants`)                                        |

**Avisos** (no bloquean): ítem sin emoji en un modo que lo usa, inicial fuera de `graphemes`, palabra
sin vocal en modo `vowel`, ítem sin verificar, tema por debajo del mínimo.

### 4.4 Criterios de aceptación

- **AC-SP1-1** `parsePack` acepta un paquete válido y rechaza uno con `schema` distinto, sin
  `themes`, o con un `mode` desconocido.
- **AC-SP1-2** `cleanPack` asigna id a un ítem nuevo y conserva el id de uno al que se le corrigió la
  `word`.
- **AC-SP1-3** `cleanPack` es idempotente: aplicarla dos veces da lo mismo que una.
- **AC-SP1-4** `playableThemes` excluye todo ítem con `verified: false`, aunque el tema quede vacío.
- **AC-SP1-5** `playableThemes` excluye ítems cuyo `sourceId` no resuelve.
- **AC-SP1-6** Un tema `listen` con 5 ítems verificados y 2 con audio no es jugable.
- **AC-SP1-7** `validatePack` da error por un `audio` `data:` o que no empieza por `audioBaseUrl`.
- **AC-SP1-8** `tokenizeGraphemes("tsitsi", ["ts","t","s","i"])` da `["ts","i","ts","i"]`.
- **AC-SP1-9** `á` y `a` + tilde combinante se tratan como la misma letra.
- **AC-SP1-10** Los tests usan fixtures propios, no datos de Supabase.

---

## 5. SP2 — `round-engine`

### 5.1 Constantes

`src/lib/word-jump/constants.ts`

```ts
export const ROUND_SIZE = 10;
export const OPTIONS_PER_QUESTION = 3;
export const MAX_REQUEUES = 2; // per item, then the answer is shown (decision #11)
```

### 5.2 Preguntas

`buildQuestion(item, theme, pack, random): Question` — una función por modo, puras y sembradas
(`mulberry32` de `src/lib/game/random.ts`, que se **reusa**, no se copia).

- **Distractores de palabra o emoji:** otros ítems jugables **del mismo tema**, nunca inventados.
  Si el tema no da para dos, se toman de otro tema jugable del mismo paquete.
- **Distractores de grafema (`first`):** primero los de `confusable[inicial]`, luego otros
  grafemas del paquete, siempre distintos de la respuesta.
- **`vowel`:** se tapa una vocal elegida por el PRNG. Las opciones son las vocales del paquete,
  hasta 4. Si la palabra tiene la misma vocal varias veces, se tapa una sola.
- El orden de las opciones sale del PRNG: la correcta no cae siempre en el mismo sitio.

### 5.3 Composición de la ronda

`buildRound(themeItems, stats, seed): PackItem[]` — primero los nunca acertados, luego los más
fallados, luego el resto; mezclado dentro de cada grupo. Si el tema tiene menos de `ROUND_SIZE`,
la ronda es más corta.

### 5.4 Reducer

Puro, igual de estricto que el de `completar-palabras`: reloj y semilla entran como argumento.

- **Acierto:** avanza la barra, el ítem sale de la cola.
- **Error:** el ítem vuelve al final si se reencoló menos de `MAX_REQUEUES` veces. Si no, se
  muestra la respuesta y sale de la cola **sin** contar como acierto.
- Entre respuesta y siguiente pregunta, un paso de feedback que se cierra con «Seguir».
- Cota: una ronda de N ítems termina en a lo sumo `N × (1 + MAX_REQUEUES)` respuestas.

### 5.5 Estadísticas por ítem

Reemplaza el `{seen, first, miss, w, e, h, last}` de la referencia por nombres que se leen solos:

```ts
type ItemStats = {
  seen: number;
  correctFirstTry: number;
  missed: number;
  lastSeenAt: string; // ISO
};
type LanguageProgress = Record<string /* item id */, ItemStats>;
```

Vive solo en el navegador (decisión #16): no hay tabla de progreso ni sincronización.

### 5.6 Criterios de aceptación

- **AC-SP2-1** Para cada modo, la misma semilla da la misma pregunta y otra semilla otro orden.
- **AC-SP2-2** Ningún distractor es igual a la respuesta, ni comparte `translation` normalizada con
  ella en `pic2word`, `listen` ni `word2pic`.
- **AC-SP2-3** Los distractores salen solo de ítems jugables (verificados) del paquete.
- **AC-SP2-4** `first` prefiere los grafemas de `confusable`.
- **AC-SP2-5** `vowel` respeta `vowelVariants` (`á` cuenta como `a`).
- **AC-SP2-6** Un ítem fallado tres veces sale de la cola con la respuesta mostrada.
- **AC-SP2-7** Una ronda de 10 nunca pasa de 30 respuestas.
- **AC-SP2-8** `buildRound` pone primero los nunca acertados.
- **AC-SP2-9** La respuesta correcta no está siempre en la misma posición a lo largo de una ronda.

---

## 6. SP3 — `pack-library` y modelo de datos

### 6.1 Tablas

Todo el SQL vive en `docs/saltapalabras-schema.sql`, como el de `solicitudes`: se pega en el SQL
Editor de Supabase y el archivo registra la fecha en que se corrió. Cada capacidad agrega su bloque.

| Tabla                       | PK                    | Contenido                                                          | Lee                      | Escribe                              | Capacidad |
| --------------------------- | --------------------- | ------------------------------------------------------------------ | ------------------------ | ------------------------------------ | --------- |
| `language_packs`            | `language`            | Versión publicada: `version`, `pack` jsonb, `note`, `published_at` | Solo `service_role`      | Solo `publish_language_pack`         | SP3       |
| `pack_versions`             | `(language, version)` | Historial inmutable: `pack`, `note`, `published_at`                | Solo `service_role`      | Solo `publish_language_pack`         | SP3       |
| `storage.objects` (`audio`) | —                     | Grabaciones ≤ 2 MB: webm, ogg, mp3, m4a, wav, aac                  | Público (bucket público) | Solo el servidor, con `service_role` | SP8       |

No hay `profiles`, `pack_drafts` ni `pack_proposals` (descartados, §12). No hay columna de autor:
el acceso interno es compartido (decisión #16); la `note` de cada publicación sirve para dejar
quién y por qué.

**Restricciones en la base:** `language ~ '^[a-z0-9-]{2,30}$'`; `pack` con `language.slug` igual a
la columna `language`, `themes` array, y `pg_column_size(pack) < 2 MB`. La lista de lenguas válidas
la impone el servidor (`languages.ts`); la base solo impone forma.

**Vista `pack_words`**: una fila por ítem publicado (`language`, `theme_id`, `item_id`, `word`,
`verified`, `has_audio`), para responder «cuánto falta verificar» y «cuánto audio hay» desde el panel
de Supabase. Sin permisos para `anon` ni `authenticated`.

**Permisos**, con la lección de `solicitudes`: RLS activado **sin políticas** en las dos tablas
(deniega todo a `anon` y `authenticated`); `revoke all` a `anon`, `authenticated` y `service_role`;
después, a `service_role`: `select, insert, update` en `language_packs`, `select, insert` en
`pack_versions` (nunca `update` ni `delete`: el historial es inmutable), `select` en la vista y
`execute` sobre la función. Nadie más que el servidor lee ni escribe.

> **Corregido el 2026-11-18 (T0.6).** El primer texto daba a `service_role` solo `select`. Como la
> función no es `security definer`, corre con los permisos de quien la llama: con solo `select`
> falla ya en el `select … for update` («permiso denegado a la tabla language_packs»), probado en
> un Postgres local. El SQL está en [docs/saltapalabras-schema.sql](../docs/saltapalabras-schema.sql).
> El límite de 2 MB se mide con `octet_length(pack::text)`, no con `pg_column_size`: este último
> mide el valor **comprimido** y dejaría pasar un paquete más grande que lo que valida el servidor.

### 6.2 Función de publicación

Una sola función, `publish_language_pack(p_language text, p_pack jsonb, p_expected_version int, p_note text) → int`
(decisión #20):

- `set search_path = ''`. `EXECUTE` revocado a `public`, `anon` y `authenticated`; concedido solo a
  `service_role`. No hace falta `security definer` ni comprobar roles adentro: solo el servidor
  puede llamarla.
- En una transacción: comprueba que `p_pack->'language'->>'slug' = p_language` (si no → `22023`),
  que la versión actual es `p_expected_version` (si no → `40001`; `null` significa «publicar
  igual»), inserta la fila en `pack_versions` y hace el `upsert` en `language_packs` con
  `version + 1` (o `1`). Devuelve la versión nueva.
- **Restaurar** una versión vieja es llamar a la misma función con el `pack` de esa versión: crea una
  versión nueva, no reescribe la historia.

En F1 todavía no existe `/admin/juego`: el primer paquete lo carga el equipo llamando a la función
desde el SQL Editor.

### 6.3 Roles

No hay roles en la base ni en la app (decisión #16). Hay dos lados:

| Lado    | Quién                       | Cómo accede                                          | Puede                                                                     |
| ------- | --------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------- |
| Público | Quien juega                 | Sin login, sin cuenta                                | Jugar paquetes publicados y escuchar sus audios. Nada más.                |
| Interno | Personas adultas del equipo | Basic Auth de `/admin` (usuario y clave compartidos) | Importar, probar, publicar, restaurar y adjuntar audio en `/admin/juego`. |

### 6.4 Lectura en el servidor

`src/lib/language-packs/library.ts` — solo servidor (`import "server-only"`), usa
`getSupabaseAdmin()` de `src/lib/supabase-admin.ts`:

- **`readPublishedPack(language)`** — lee `language_packs`, pasa por `parsePack` y devuelve el
  paquete o `null` si la lengua no tiene uno publicado. **Si Supabase devuelve error o una respuesta
  malformada, lanza** (no devuelve `null`): así una revalidación fallida no reemplaza el paquete bueno
  por «no disponible». Si faltan las variables de entorno devuelve `{ status: "unconfigured" }`, sin
  lanzar.
- **`getPublishedPack(language)`** — `readPublishedPack` envuelta en `unstable_cache` con
  `tags: ["word-jump-pack:<language>"]` y `revalidate: 3600`. El proyecto **no** tiene Cache
  Components activado; `unstable_cache` es la API que corresponde a ese modo (la documentación de
  Next 16 la marca como reemplazada por `use cache`, que exige activar Cache Components: queda fuera
  de este spec).
- **`listVersions(language)`**, **`publishPack(...)`** — para `/admin/juego`, sin caché.

**Cómo se comporta la página `/juegos/saltapalabras/[lengua]`:**

- `generateStaticParams` devuelve **`[]`**: ninguna lengua se renderiza en el build, así que **el
  build no depende de Supabase** (un despliegue por una foto nueva no falla si Supabase está pausado).
  Cada lengua se genera en su **primera visita** y queda en caché (ISR), con `revalidate = 3600`.
  Lenguas fuera de `languages.ts` → `notFound()`.
- **Supabase falla en una revalidación** (caído o **pausado**: el plan gratis pausa el proyecto tras 7
  días sin actividad) → `readPublishedPack` lanza → Next **sigue sirviendo la última página generada
  bien** y reintenta en la siguiente visita (guía de ISR de Next 16). Quien juega no nota nada.
- **Supabase falla en la primera visita** (nunca hubo una página buena) → `error.tsx` del segmento
  muestra «El juego no está disponible ahora» con enlace a `completar-palabras`. Un error no queda en
  caché: la siguiente visita reintenta.
- **Sin variables de entorno** (CI, desarrollo sin `.env.local`) → página «no disponible», sin error.
- Al publicar desde `/admin/juego`, el Route Handler llama **solo** a
  `revalidateTag("word-jump-pack:<lengua>", "max")`. La primera visita después de publicar todavía
  recibe la versión anterior y dispara la regeneración; la siguiente ya ve la nueva.
  `updateTag` no sirve aquí: solo funciona en Server Actions, y publicar es un Route Handler (§9.1).
- **No se llama a `revalidatePath`** (corregido el 2026-11-18, T0.2/T0.3). Medido con `next start`:
  `revalidatePath` **descarta** la página en lugar de marcarla vieja, así que la visita siguiente
  la regenera en primer plano; si en ese momento Supabase falla, responde **500** en vez de seguir
  mostrando el paquete bueno. Con `revalidateTag(…, "max")` solo, la regeneración ocurre en segundo
  plano y, si falla, se sigue sirviendo la última página buena (igual que la revalidación por tiempo).
- `/juegos/saltapalabras` (la biblioteca) **no lee Supabase**: lista las lenguas de `languages.ts`
  y su estado conocido en código (por ejemplo, uro sin paquete y por qué). Cada página de lengua
  dice si tiene paquete. Así la biblioteca es estática `○` y nunca depende de la base.

La `service_role` sigue solo en el servidor y nunca en una variable `NEXT_PUBLIC_`. No hay clave
pública de Supabase en el bundle. `check:secrets` debe seguir limpio.

### 6.5 Criterios de aceptación

- **AC-SP3-1** _(modificado)_ `anon` y `authenticated` no pueden leer, insertar, actualizar ni borrar
  en `language_packs`, `pack_versions` ni `pack_words`.
- **AC-SP3-2** _(modificado)_ `anon` y `authenticated` no pueden ejecutar `publish_language_pack`;
  `service_role` sí.
- **AC-SP3-3** Publicar crea v1; volver a publicar con `expected = 1` crea v2 y una fila en
  `pack_versions`.
- **AC-SP3-4** Publicar con `expected = 1` cuando la actual es 2 lanza `40001` y no cambia nada.
- **AC-SP3-5** Publicar un paquete cuyo `language.slug` no coincide lanza `22023`.
- **AC-SP3-6** Un paquete de 2 MB o más se rechaza en la base, aunque el servidor no lo haya
  validado.
- **AC-SP3-7** `readPublishedPack` con una respuesta malformada **lanza**; no devuelve un paquete a
  medias ni `null`.
- **AC-SP3-8** Sin variables de entorno, `readPublishedPack` devuelve `unconfigured` sin lanzar.
- **AC-SP3-9** La tabla `solicitudes` y sus permisos quedan exactamente como estaban.
- **AC-SP3-10** _(nuevo)_ `pnpm build` sin variables de Supabase termina bien y no hace ninguna
  petición a Supabase.
- **AC-SP3-11** _(nuevo)_ Con una página de lengua ya generada, si Supabase empieza a fallar (simulado
  en el test de integración o pausando el proyecto en la prueba manual), la página sigue mostrando el
  último paquete.
- **AC-SP3-12** _(nuevo)_ El bundle del navegador no contiene la URL de la API REST de Supabase ni
  ninguna clave de Supabase (las únicas URLs de Supabase en el cliente son las de audio que trae el
  propio paquete).

---

## 7. SP4 — `game-page`

### 7.1 Contrato de URL

| URL                              | Comportamiento                                                         |
| -------------------------------- | ---------------------------------------------------------------------- |
| `/juegos/saltapalabras`          | Biblioteca estática: lenguas de `languages.ts` y su estado.            |
| `/juegos/saltapalabras/[lengua]` | El juego. Lengua conocida sin paquete jugable → «aún no disponible».   |
| `/juegos/saltapalabras/klingon`  | 404.                                                                   |
| `/admin/juego`                   | Administración interna (SP6). Basic Auth. No se enlaza desde el sitio. |

**El juego es libre de login** (decisión #18): ninguna ruta de `/juegos/saltapalabras/**` pide,
ofrece ni enlaza un ingreso, ni a `/admin`. Sin query params: el tema y la ronda no van a la URL.

### 7.2 Pantallas

1. **Inicio de lengua** — título del paquete, temas jugables con icono y modo, versión publicada y
   fuentes.
2. **Ronda** — _(reemplazada el 2026-11-20 por el nivel de plataformas de §7.6)_ arriba la barra
   de progreso. Al centro el canvas con el personaje y tres plataformas, cada una con una opción.
   Debajo, los tres `<button>` con las mismas opciones (son el control de verdad). Al elegir, el
   personaje salta; al acertar aterriza, al fallar rebota.
3. **Feedback** — correcto o incorrecto con icono y texto, la palabra con su traducción y su fuente,
   el audio si hay, la frase de `praise` si está publicada, y «Seguir».
4. **Resumen** — aciertos a la primera, palabras para repasar, «Otra ronda», «Elegir otro tema».

Las pantallas son componentes cliente que reciben el paquete ya filtrado por `playableThemes` desde
el componente de servidor de la página. Los mismos componentes se reusan en la vista previa de
`/admin/juego` (§9.1), que es el **único** lugar donde se juega contenido sin publicar.

### 7.3 Accesibilidad (obligatoria)

- El canvas lleva `aria-hidden="true"`. Toda la información está también en el DOM.
- Opciones como `<button>`, atajos **1 / 2 / 3** con `aria-keyshortcuts`, foco a «Seguir» tras
  responder, feedback en `role="status"`.
- Correcto e incorrecto nunca solo por color.
- Palabras en la lengua con `lang={pack.language.isoCode}`. Las traducciones, sin `lang`.
- El emoji de la pregunta lleva nombre accesible: la traducción («perro»), no el nombre Unicode.
- `prefers-reduced-motion`: sin salto animado; se resalta la opción y se pasa al feedback.
- Botones de al menos 44 × 44 px: el público incluye niñas y niños en tablets.

### 7.4 Progreso local

Clave `living-langs:word-jump:v1`, mismo patrón que `progress-store.ts` de `completar-palabras`
(`useSyncExternalStore`, valor validado al leer, juego jugable si `localStorage` falla). Se escribe
al terminar cada ronda. Guarda `LanguageProgress` por lengua y `settings` (`{ sound: boolean }`).
No guarda nada que identifique a nadie.

### 7.5 Criterios de aceptación

- **AC-SP4-1** _(modificado)_ En la tabla de `pnpm build`, `/juegos/saltapalabras` es estática (`○`)
  y `/juegos/saltapalabras/[lengua]` no es dinámica (`ƒ`): se genera en la primera visita y queda en
  caché (ISR).
- **AC-SP4-2** _(modificado 2026-11-20)_ Con un paquete publicado (lectura de Supabase simulada), se
  elige un tema, se juega el nivel entero y se llega a la meta con su resumen.
- **AC-SP4-3** Un ítem `verified: false` del paquete publicado no aparece en ninguna pregunta.
- **AC-SP4-4** _(modificado 2026-11-20)_ Fallar tacha esa opción, dice «No es esa» y deja probar
  otra en el mismo reto; al acertar se muestra la palabra con su traducción y su fuente. (Antes: el
  ítem volvía al final de la ronda.)
- **AC-SP4-5** _(modificado 2026-11-20)_ Nivel completo solo con teclado: Tab/1-2-3, Enter, foco en
  «Seguir» tras acertar.
- **AC-SP4-6** _(modificado 2026-11-20)_ Con `prefers-reduced-motion`, responder con un botón o con
  1/2/3 no anima el salto ni la puerta: no se pide ningún cuadro de animación.
- **AC-SP4-7** Recargar tras una ronda conserva el progreso; con `localStorage` bloqueado, se juega
  igual.
- **AC-SP4-8** _(modificado)_ Sin variables de Supabase, o si Supabase falla en la primera visita, la
  página dice que el juego no está disponible y enlaza a `completar-palabras`. No hay pantalla en
  blanco ni error sin capturar. Si ya hubo una página buena, se sigue mostrando (AC-SP3-11).
- **AC-SP4-9** `/juegos/saltapalabras/uro` responde 200 y explica por qué no hay paquete.
- **AC-SP4-10** `/juegos/saltapalabras/klingon` responde 404.
- **AC-SP4-11** Las palabras en la lengua llevan el `lang` del paquete.
- **AC-SP4-12** _(nuevo)_ **Juego libre de login:** ninguna ruta de `/juegos/saltapalabras/**`
  responde 401, contiene un formulario de ingreso, ni enlaza a `/admin` o a una página de ingreso
  (e2e que recorre la biblioteca, una lengua con paquete, uro y una ronda completa).
- **AC-SP4-13** _(nuevo)_ El navegador de quien juega no hace ninguna petición a la API REST de
  Supabase (`/rest/v1/*`, `/auth/v1/*`) en todo el recorrido de AC-SP4-12.

### 7.6 SP4b — `platformer`: el nivel de plataformas (2026-11-20)

Reemplaza la pantalla «Ronda» de §7.2. Inicio de lengua, resumen, progreso y accesibilidad (§7.3)
siguen valiendo; el resumen pasa a ser la **meta**.

**El nivel.** Una partida es un nivel que corre de izquierda a derecha con un **reto por palabra**
(las de `buildRound`, §5.3). Cada reto tiene sus **nubes de respuesta** (una por opción: 3, o hasta
4 en «vocal que falta») flotando sobre el camino y una **puerta de madera** al final. Al final del
nivel, la **meta** con el trofeo.

**Cómo se juega.**

- Pip corre (← → o A/D), salta (espacio, ↑ o W; más alto si se mantiene; con un margen breve tras
  dejar el suelo) y responde **tocando una nube con la cabeza**.
- **Acierto:** la nube estalla en estrellas, la puerta se abre, suena el efecto y el `role="status"`
  muestra «¡Correcto!» con la palabra, su traducción y su fuente. Se sigue caminando por la puerta o
  con «Seguir».
- **Error:** la nube queda gris y tachada (y su botón, deshabilitado y marcado «tachada»); se prueba
  otra. Ningún error cuesta vidas en F5a.
- **Puntos:** +10 por acierto a la primera, +5 por acierto tras fallar (`⭐ puntos · reto/total`).
- **Botones = misma jugada:** cada opción es un `<button>` (y tecla 1/2/3) que hace saltar a Pip a
  esa nube y responde al instante. Con `prefers-reduced-motion`, Pip aparece bajo la nube sin
  animar.
- **Pista arriba:** el dibujo (nombrado por su traducción), la palabra o la palabra con hueco, como
  en §5.2. _(Cambiado el 2026-11-21, ver §7.7.)_ El 🔊 está siempre en la barra de pista y la
  palabra también suena sola al acercarse y al acertar.
- **Sonido:** efectos generados con Web Audio (salto, acierto, error, puerta, meta), creados al primer
  gesto, con un botón «Sonido: sí / no» que guarda `settings.sound`.
- **Menú:** pausa con «Seguir jugando», «Elegir otro tema» y el sonido.
- **Celular:** botones táctiles ◀ ▶ ⤒ de 44 px como mínimo; sin scroll horizontal a 360 px.
- **Meta:** «¡Llegaste a la meta!», aciertos a la primera, puntos, palabras para repasar con
  **«Repasar las falladas»** (un nivel nuevo solo con esas), «Otra partida» y «Elegir otro tema».

**Arquitectura.** La lógica vive en `src/lib/word-jump/platformer/`, pura y con tests: `physics.ts`
(cuerpo, gravedad, salto variable, margen de salto, choques con suelo y puerta), `level.ts` (trazado
del nivel a partir de las preguntas, nubes, puertas, meta, cámara) y `game.ts` (estado del nivel:
responder, tachar, puntos, avanzar, resultado para el progreso). `src/components/word-jump/` solo
dibuja (canvas 2D + `requestAnimationFrame`, que **solo corre mientras algo se mueve**) y conecta el
DOM. Sin dependencias nuevas.

**Fases.** F5a: el nivel de punta a punta (lo de arriba). F5b: huecos, plataformas elevadas,
caracoles (+2 al pisarlos), vidas con corazones; caer o tocar un caracol quita una vida y devuelve al
inicio del reto; sin vidas, termina la partida en el resumen. F5c: ajustes por partida
(Principiante / Intermedio / Avanzado: palabras 5/8/12/15, vidas infinitas/3/5, caracoles, huecos,
velocidad, mostrar la traducción) guardados en `settings`, y personajes a elegir (zorrito por
defecto). «Decir la palabra al acercarse» se adelantó a §7.7 (2026-11-21).

**Criterios de aceptación (F5a).**

- **AC-SP4b-1** Elegir un tema abre el nivel: canvas con Pip, las nubes del primer reto y la pista
  arriba; el `role="status"` y las opciones están en el DOM.
- **AC-SP4b-2** Tocar la nube correcta con la cabeza (física) o pulsar su botón responde lo mismo:
  «¡Correcto!», la puerta del reto se abre y suman 10 puntos.
- **AC-SP4b-3** Una opción incorrecta queda tachada (botón deshabilitado, nombre accesible con
  «tachada») y el reto sigue; acertar después suma 5.
- **AC-SP4b-4** La puerta cerrada no deja pasar: Pip no avanza más allá hasta acertar. Con la puerta
  abierta, caminar a través de ella (o «Seguir») lleva al reto siguiente.
- **AC-SP4b-5** Tras el último reto, la meta muestra «¡Llegaste a la meta!», los aciertos a la
  primera, los puntos y las palabras falladas; «Repasar las falladas» abre un nivel solo con ellas.
- **AC-SP4b-6** El salto sube más si se mantiene la tecla, y se puede saltar un instante después de
  dejar el suelo (margen de salto), comprobado en la física pura.
- **AC-SP4b-7** _(modificado el 2026-11-21, reemplazado por AC-SP4c-1 a AC-SP4c-6)_ Antes decía: el
  🔊 aparece solo si el ítem tiene `audio` y nunca se usa `speechSynthesis`.
- **AC-SP4b-8** Los efectos de sonido se pueden apagar con un botón y la elección se recuerda al
  recargar.
- **AC-SP4b-9** A 360 px de ancho no hay scroll horizontal y los controles táctiles miden al menos
  44 × 44 px.
- **AC-SP4b-10** El JS que la ruta del juego agrega es solo el del juego: ninguna otra ruta lo
  descarga, y la página sigue siendo ISR como en AC-SP4-1.

### 7.7 SP4c — `speech`: las palabras suenan (2026-11-21)

Decisión #6 reescrita: **grabación primero, voz del navegador como provisional.**

**Qué suena.** Siempre la palabra del reto en la lengua (`challenge.item.word`): en `pic2word` es la
respuesta; en `word2pic` y `listen`, la palabra que se muestra o se oye; en `first` y `vowel`, la
palabra completa. Se elige así (`planSpeech`, puro):

1. Sonido general apagado (`settings.sound = false`) → no suena nada.
2. El ítem tiene `audio` → la **grabación** (`Audio`), aunque la voz aproximada esté apagada.
3. `language.tts.quality = "off"` o la persona apagó «Voz aproximada» → no suena; el 🔊 queda
   deshabilitado con la razón.
4. Si no, la **voz del navegador**: `speechSynthesis` con la voz cuyo idioma coincide con
   `tts.lang` (por defecto `es-PE`), si no hay, cualquier `es-*`; el texto pasa antes por
   `tts.replace`. Sin `speechSynthesis` o sin ninguna voz `es`, no suena y el aviso lo explica.

**Cuándo suena.** Al **acercarse** Pip a las nubes de un reto (una sola vez por reto; ajuste «Decir
la palabra al acercarse: sí / no», por defecto sí), al **acertar** (después del efecto) y al pulsar
**🔊**. Antes de hablar se cancela la voz anterior; al salir del nivel, también. Nada suena antes
del primer gesto de la persona en el nivel (tecla, toque o clic): al acercarse sin gesto previo,
simplemente no suena, sin error.

**Aviso.** Cuando lo que sonaría es la voz aproximada, junto a la pista se lee: «Pronunciación
aproximada: aún no tenemos la grabación de un hablante». Sin voz disponible: «Este navegador no
tiene una voz en castellano: la palabra no suena hasta que tengamos la grabación de un hablante».

**Ajustes** en el Menú, guardados en `settings` del navegador junto al sonido: «Voz aproximada: sí /
no» (`voice`, por defecto sí) y «Decir la palabra al acercarse: sí / no» (`announce`, por defecto
sí). Un progreso guardado antes del 2026-11-21 (sin esas claves) se lee con los dos en sí.

**Pasos.** Mientras Pip corre por el suelo suena un paso corto (Web Audio, como los demás efectos)
a ritmo fijo; nada en el aire ni parado. Respeta el sonido general.

**Arquitectura.** La lógica es pura en `src/lib/word-jump/speech.ts` (qué texto, qué plan, qué
voz, `replace`) y `src/lib/word-jump/platformer/` (cuándo se llega a las nubes, ritmo de pasos). El
acceso a `speechSynthesis` y `Audio` va en un módulo cliente pequeño e inyectable
(`src/components/word-jump/word-speaker.ts`).

**Criterios de aceptación.**

- **AC-SP4c-1** Con un ítem con `audio`, el 🔊, el acercamiento y el acierto reproducen la grabación
  con `Audio` y nunca llaman a `speechSynthesis.speak`.
- **AC-SP4c-2** Con un ítem sin `audio`, se llama a `speechSynthesis.speak` con la palabra (tras
  `tts.replace`) y una voz `es-PE` si existe, si no `es-*`; y se ve el aviso «Pronunciación
  aproximada».
- **AC-SP4c-3** La palabra suena una sola vez al acercarse Pip a las nubes de cada reto, y otra al
  acertar; con «Decir la palabra al acercarse: no», al acercarse no suena.
- **AC-SP4c-4** Con «Voz aproximada: no» o `tts.quality = "off"`, nunca se llama a
  `speechSynthesis.speak`; el 🔊 queda deshabilitado con la razón si no hay grabación. Las dos
  elecciones del Menú se recuerdan al recargar.
- **AC-SP4c-5** Sin `speechSynthesis` o sin voz `es`, no hay error: el aviso explica que la palabra
  no suena y el juego sigue.
- **AC-SP4c-6** Con «Sonido: no» no suena nada (ni grabación, ni voz, ni pasos), y nada suena antes
  del primer gesto en el nivel.
- **AC-SP4c-7** Al correr por el suelo suena un paso a ritmo fijo; en el aire o parado, no.
- **AC-SP4c-8** Un paquete con `language.tts` inválido (sin `lang`, `quality` desconocida, `replace`
  vacío) no se puede publicar; sin el bloque, publica y suena con `es-PE`.

---

## 8. SP5 — `admin-access`

Se reusa el acceso de [edicion-fotos.md](./edicion-fotos.md) §4 (capacidad E1), sin cambios
(decisión #17):

- `src/proxy.ts` con `matcher: ['/admin/:path*', '/api/admin/:path*']` y HTTP Basic Auth contra
  `ADMIN_USER` / `ADMIN_PASSWORD`. Sin esas variables, `/admin` responde `503` y nunca queda abierto.
- `src/lib/admin/basic-auth.ts` (comparación en tiempo constante), que también usa cada Route Handler
  de `/api/admin/juego/**` para volver a comprobar las credenciales.
- `/admin/juego` lleva `robots: { index: false }` y no se enlaza desde ninguna página pública ni
  desde el header.
- La contraseña se entrega solo a **personas adultas del equipo**. Es responsabilidad de quien la
  entrega, y queda escrito como paso en `docs/saltapalabras-pruebas.md`.

Si `edicion-fotos` todavía no está implementada cuando empiece F2, esta capacidad implementa su E1
tal como está especificado allí (mismos archivos y AC-E1-1 a AC-E1-5); no se crea una variante.

### 8.1 Privacidad

No hay datos personales: ni de quien juega (todo vive en su navegador) ni del equipo (no hay
cuentas).

- Al pulsar el botón de sonido, el navegador de quien juega descarga el audio **directo de Supabase
  Storage** (decisión #19), así que Supabase ve su IP. Antes de pulsar no hay ninguna conexión
  (`preload="none"`).
- [docs/politica-privacidad.md](../docs/politica-privacidad.md) y `/privacidad` suman un párrafo
  corto: el juego no recoge datos; al reproducir una pronunciación, el audio se descarga de Supabase;
  las grabaciones publicadas son de hablantes que dieron su consentimiento (SP8).

### 8.2 Criterios de aceptación

- **AC-SP5-1 a AC-SP5-7** _(eliminados el 2026-11-17)_: cubrían registro por invitación, enlace
  mágico, `profiles` y roles, que ya no existen.
- **AC-SP5-8** _(nuevo)_ Sin credenciales, `GET /admin/juego` y cualquier `/api/admin/juego/**`
  responden `401` (equivale a AC-E1-1 de `edicion-fotos`).
- **AC-SP5-9** _(nuevo)_ Los Route Handlers de `/api/admin/juego/**` rechazan con `401` aunque se los
  llame sin pasar por el proxy.
- **AC-SP5-10** _(nuevo)_ El proxy no corre en `/juegos/**` (lo verifica también AC-SP4-12).

---

## 9. SP6 — `pack-admin`

### 9.1 Qué hace `/admin/juego`

Una página interna (componente de servidor + un formulario cliente), detrás del Basic Auth. Por
lengua de `languages.ts`:

- **Estado:** versión publicada, fecha, nota, y conteo de ítems sin verificar y sin audio.
- **Importar** un `.json` (o partir del publicado). El paquete importado se guarda **solo en el
  navegador** (memoria + copia en `localStorage` como respaldo si se cierra la pestaña) mientras se
  trabaja en él. No hay borradores en la base.
- **Validar:** al importar pasa por `parsePack` → `cleanPack` → `validatePack`. Si `parsePack`
  falla, se explica qué falla y no se carga nada. Errores y avisos en una lista que lleva al ítem.
- **Probar:** juega el paquete importado con los mismos componentes del juego, con un aviso visible
  «Vista previa: puede tener errores». Muestra **también** los ítems sin verificar (marcados), para
  poder revisarlos. No cuenta para el progreso. **Es el único lugar del sitio donde se juega
  contenido sin publicar** (decisión #18).
- **Exportar** el paquete en preparación a `.json` (para guardarlo o mandarlo a revisar fuera).
- **Publicar:** `POST /api/admin/juego/[lengua]/publicar` con el paquete, la versión esperada y una
  nota. El servidor vuelve a validar con `validatePack` (no confía en el navegador), llama a
  `publish_language_pack` e invalida la caché (§6.4). En conflicto (`40001`), aviso con la versión
  actual y dos salidas: «Descargar la publicada» y «Publicar igual» (`expected = null`).
- **Historial:** versiones con fecha y nota; «Descargar» y «Restaurar» (publica esa versión como una
  nueva).

Las acciones van por **Route Handlers** y no por Server Actions: un paquete puede pesar hasta 2 MB y
las Server Actions limitan el cuerpo a 1 MB por defecto; además así cada handler aplica el mismo
chequeo de Basic Auth.

### 9.2 Lo que se perdió al quitar roles

Antes, solo un `editor` podía marcar `verified` o publicar. Ahora cualquiera con la clave de
`/admin` puede. Se acepta porque el acceso es de pocas personas adultas del equipo, y se compensa
con: el conteo visible de ítems sin verificar antes de publicar, la nota obligatoria al publicar, y
el historial con «Restaurar».

### 9.3 Quién verifica

Marcar `verified: true` es afirmar que la palabra, la traducción, la fuente y (si hay) el audio se
comprobaron con un hablante o con la fuente citada. Se hace en el JSON antes de importarlo o, desde
el 2026-11-20, en el editor (§9.5), y se revisa en «Probar». La nota de publicación dice quién lo
comprobó.

### 9.4 Criterios de aceptación

- **AC-SP6-1** _(eliminado el 2026-11-17)_: borrador en `pack_drafts`; ya no hay borradores en la
  base.
- **AC-SP6-2** _(eliminado el 2026-11-17)_: elegir entre copia local y nube; ya no hay copia en la
  nube.
- **AC-SP6-3** Exportar y reimportar da el mismo paquete.
- **AC-SP6-4** Importar un `.json` inválido no cambia el paquete en preparación y explica el error.
- **AC-SP6-5** _(eliminado el 2026-11-17)_: control «verificado» según rol; ya no hay roles.
- **AC-SP6-6** Un paquete con errores de §4.3 no se puede publicar, y el servidor lo rechaza aunque
  el navegador lo envíe igual.
- **AC-SP6-7** Publicar con versión vieja muestra el conflicto. «Publicar igual» publica.
- **AC-SP6-8** Todo `/admin/juego` se usa con teclado, y cada campo tiene `<label>`.
- **AC-SP6-9** _(nuevo; antes AC-SP7-6)_ Restaurar v1 sobre v3 crea v4 con el contenido de v1, y v2
  y v3 siguen en el historial.
- **AC-SP6-10** _(nuevo)_ «Probar» juega el paquete sin publicar, incluidos los ítems sin verificar
  marcados como tales; nada de eso aparece en `/juegos/saltapalabras/**`.
- **AC-SP6-11** _(nuevo)_ Tras publicar, la página pública de esa lengua muestra la versión nueva a
  más tardar en la segunda visita (revalidación `"max"`, §6.4).
- **AC-SP6-12** _(nuevo)_ Publicar sin nota no se permite.
- **AC-SP6-13** _(nuevo)_ Cerrar y reabrir la pestaña de `/admin/juego` recupera el paquete en
  preparación desde `localStorage`, y «Descartar» lo borra.

### 9.5 SP6b — `pack-editor`: editor mínimo (2026-11-20)

Edita **el paquete en preparación** de §9.1, no la base: cada cambio se guarda en el navegador y
llega al público solo al **publicar** con el flujo de siempre (nota, versión esperada, conflicto,
historial). «Partir del publicado» pasa a llamarse **«Editar el paquete publicado»**.

**Decisiones**

| #   | Decisión                       | Elección                                                                                                                                                                                                                                                                                                                                                 |
| --- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | **Qué se edita**               | Por palabra: **emoji**, **traducción**, **verificada** y la **palabra** misma. Además: **agregar** una palabra a un tema y **quitarla** de un tema. Nada se genera: todo lo escribe la persona.                                                                                                                                                          |
| E2  | **Una palabra, un dato**       | Una palabra puede estar en varios temas, y `cleanPack` le da un `id` distinto en cada uno (los `id` son únicos en todo el paquete). Por eso emoji, traducción, palabra y verificada se cambian **en todos los temas donde está la misma palabra** (escrita igual, tras `normalizeWord`); lo que es por tema es solo estar o no estar (agregar y quitar). |
| E3  | **`id` estable**               | Corregir la palabra conserva su `id` (spec §4.1): el progreso de quien juega no se pierde. Una palabra nueva recibe su `id` de `cleanPack`.                                                                                                                                                                                                              |
| E4  | **Un tema a la vez**           | Se elige el tema y se ve su lista, con búsqueda (palabra o traducción) y filtros «Sin verificar» y «Sin dibujo». Un aviso de §4.3 lleva al tema y a la palabra, quitando los filtros que la oculten.                                                                                                                                                     |
| E5  | **Editar en la fila**          | «Editar» abre los campos en la misma fila con «Guardar» y «Cancelar»; «Verificada» es una casilla que se guarda al marcarla. Así cada cambio es una sola escritura en el navegador, no una por tecla.                                                                                                                                                    |
| E6  | **Acción masiva**              | «Marcar todas las de este tema como verificadas», con confirmación que dice cuántas cambian y que también quedan verificadas en los otros temas donde están (E2).                                                                                                                                                                                        |
| E7  | **Validación en vivo**         | Tras cada cambio corre `validatePack`; los errores siguen bloqueando publicar y los avisos enlazan a la fila (E4). Una palabra o traducción vacía no se guarda: se explica en el campo.                                                                                                                                                                  |
| E8  | **Fuente de lo agregado**      | Una palabra nueva elige su fuente entre las del paquete. Sin fuente no se juega (§4.2) y se avisa: el editor no la bloquea, pero no se publica como jugable.                                                                                                                                                                                             |
| E9  | **No toca los datos del repo** | El editor cambia el paquete, no `src/data/word-jump/ashaninka-pictures.json` ni el diccionario.                                                                                                                                                                                                                                                          |

**Criterios de aceptación**

- **AC-SP6b-1** Sin paquete en preparación y con uno publicado, «Editar el paquete publicado» lo
  copia y muestra el editor con el primer tema elegido.
- **AC-SP6b-2** Cambiar el emoji de una palabra lo cambia en todos los temas donde está la misma
  palabra; la traducción, la palabra y «verificada» igual. Ningún `id` cambia.
- **AC-SP6b-3** Desmarcar «Verificada» deja la palabra fuera de «Probar» como jugable (marcada
  «⚠ Sin verificar») y suma uno al conteo de sin verificar.
- **AC-SP6b-4** «Marcar todas las de este tema como verificadas» pide confirmación con el número de
  palabras, y al confirmar no queda ninguna sin verificar en ese tema.
- **AC-SP6b-5** Guardar una palabra o traducción vacía no cambia nada y muestra el error junto al
  campo.
- **AC-SP6b-6** Agregar una palabra con traducción y fuente la deja en el tema elegido con un `id`
  nuevo; quitarla de un tema no la quita de los demás.
- **AC-SP6b-7** Buscar y filtrar («Sin verificar», «Sin dibujo») reduce la lista; un enlace de aviso
  lleva a su palabra aunque un filtro la ocultara.
- **AC-SP6b-8** Los cambios sobreviven a recargar la página (AC-SP6-13) y se publican con el flujo
  de SP6: tras publicar, el juego los muestra (AC-SP6-11).
- **AC-SP6b-9** Todo el editor se usa con teclado; cada campo tiene `<label>`; los objetivos miden
  al menos 44 × 44 px; a 360 px de ancho no hay scroll horizontal.

---

## 10. SP8 — `audio`

- En «Ítems» de `/admin/juego`, por ítem: **Subir archivo** de audio. Antes del primer audio de una
  sesión, quien sube confirma que tiene el consentimiento de quien habla para publicarlo y cómo
  quiere ser acreditada/o (`sources[]` de tipo `speaker`).
- `POST /api/admin/juego/[lengua]/audio` (`multipart/form-data`): Basic Auth → tipo y tamaño (≤ 2 MB,
  tipos de §6.1) → el servidor sube con `service_role` a `audio/<language>/<uuid>.<ext>` →
  devuelve la URL pública, que se escribe en `item.audio` del paquete en preparación. El archivo
  queda en Storage aunque el paquete no se publique; un audio que no está en ningún paquete
  publicado es un huérfano aceptado (`docs/saltapalabras-schema.sql` incluye la consulta para
  encontrarlos).
- Un audio entra al juego solo cuando se publica el paquete con ese ítem verificado: la verificación
  cubre palabra **y** pronunciación.
- En el juego, el audio no se precarga y suena con 🔊, al acercarse y al acertar (§7.7, desde el
  2026-11-21), nunca antes del primer gesto en el nivel. Con `settings.sound = false`, no suena nada.
- `next.config.ts` no cambia por esto: `<audio>` no pasa por `next/image` ni necesita
  `remotePatterns`.

### 10.1 Criterios de aceptación

- **AC-SP8-1** _(eliminado el 2026-11-17)_: carpeta por usuario en el bucket; ya no hay usuarios.
- **AC-SP8-2** _(modificado)_ Un archivo de más de 2 MB o de un tipo no permitido se rechaza en el
  Route Handler **y** en el bucket.
- **AC-SP8-3** _(eliminado el 2026-11-17)_: corte de la grabación a los 8 s; ya no se graba en el
  navegador.
- **AC-SP8-4** Con un tema `listen` con 3 ítems verificados con audio, la ronda «escuchar» se juega.
- **AC-SP8-5** _(modificado el 2026-11-21)_ El audio nunca se reproduce antes del primer gesto de la
  persona en el nivel (antes: «sin una acción de la persona»; ahora también suena al acercarse y al
  acertar, §7.7).
- **AC-SP8-6** _(eliminado el 2026-11-17)_: permiso de micrófono; ya no se graba.
- **AC-SP8-7** _(nuevo)_ Sin credenciales, `POST /api/admin/juego/[lengua]/audio` responde `401` y no
  sube nada.
- **AC-SP8-8** _(modificado el 2026-11-21)_ Hasta el primer gesto de quien juega en el nivel, su
  navegador no hace ninguna petición al dominio de Supabase; después, solo pide la grabación del
  reto al acercarse, al acertar o con 🔊.
- **AC-SP8-9** _(nuevo)_ La URL devuelta empieza por la URL pública del bucket `audio` y pasa
  AC-SP1-7.

---

## 11. Estructura, comandos, estilo y pruebas

### 11.1 Archivos

```
src/app/juegos/saltapalabras/
├── page.tsx                         SP4  biblioteca (estática, sin Supabase)
├── [lengua]/page.tsx                SP4  juego (ISR, generateStaticParams → [])
└── [lengua]/error.tsx               SP4  «no disponible» si falla la primera visita
src/app/admin/juego/page.tsx         SP6  administración interna
src/app/api/admin/juego/[lengua]/publicar/route.ts   SP6
src/app/api/admin/juego/[lengua]/versiones/route.ts  SP6  historial (GET)
src/app/api/admin/juego/[lengua]/audio/route.ts      SP8

src/lib/language-packs/              SP1, SP3 — sin React
├── types.ts  schema.ts  clean.ts  validate.ts  playable.ts  graphemes.ts
├── library.ts                       SP3  server-only: lectura cacheada y publicación
└── edit-pack.ts                     SP6b editor mínimo: cambios puros sobre el paquete
src/lib/word-jump/                   SP2 — sin React
├── constants.ts  questions.ts  round.ts  stats.ts
└── progress.ts  progress-store.ts   SP4  localStorage
src/lib/supabase-admin.ts            ya existe: se reusa
src/proxy.ts  src/lib/admin/basic-auth.ts   SP5  de edicion-fotos.md (se reusa o se crea tal cual)

src/components/word-jump/            SP4  canvas, ronda, feedback, resumen (también para «Probar»)
src/components/admin/pack-admin/     SP6, SP8  importar, validar, publicar, historial, audio
                                     SP6b pack-editor, editor-row, item-fields, add-item-form, verify-theme

docs/saltapalabras-schema.sql        SP3, SP8 (un bloque por capacidad)
docs/saltapalabras-pruebas.md        verificación manual contra Supabase real, como solicitudes-pruebas.md
docs/saltapalabras-referencia.md     el diseño de referencia (ya existe)

tests/unit/language-packs/*.test.ts
tests/unit/word-jump/*.test.ts
tests/e2e/word-jump.spec.ts  pack-admin.spec.ts

MODIFICADOS
  src/lib/privacy/policy.ts + docs/politica-privacidad.md   un párrafo (§8.1)
  src/lib/languages.ts               aimara, solo con fuente citada (§14, pregunta 1)
  specs/README.md                    fila en el índice
```

No se crean `src/lib/supabase-browser.ts`, `src/lib/team-session.ts`, `src/app/ingresar/` ni
`src/components/team-access/`.

### 11.2 Comandos

Los de siempre, sin scripts nuevos salvo que el plan los justifique:

```
pnpm dev                 desarrollo
pnpm check:fast          tras cada edición
pnpm check:task          al cerrar una tarea
pnpm test:e2e            Playwright contra next build && next start
pnpm build               la tabla de rutas confirma AC-SP4-1
```

### 11.3 Estilo

Manda [AGENTS.md](../AGENTS.md) y [CONSTRAINTS.md](../CONSTRAINTS.md). Además:

- `src/lib/language-packs/` y `src/lib/word-jump/` no importan React ni tocan `window`, salvo
  `progress-store.ts` (recibe el storage por argumento). `library.ts` recibe el cliente de Supabase
  por argumento para poder sustituirlo en un test, y lleva `import "server-only"`.
- Se reusa `mulberry32`, `shuffle` y `hash` de `src/lib/game/`; no se duplican.
- Server Components por defecto; `"use client"` solo en `src/components/word-jump/` y
  `src/components/admin/pack-admin/`. **Única excepción:** `src/app/juegos/saltapalabras/[lengua]/error.tsx`,
  porque Next exige que los límites de error sean componentes cliente (anotado en T1.10).

```ts
// src/app/juegos/saltapalabras/[lengua]/page.tsx
const { lengua: language } = await params; // la URL es en español, el código no
```

### 11.4 Pruebas

- **Vitest, lógica pura:** SP1, SP2, el códec de progreso y la traducción de errores de Postgres
  (`40001` → `version_conflict`, `22023` → `language_mismatch`). Fixtures propios.
- **Vitest, servidor:** `library.ts` con cliente simulado (lanza ante error, `unconfigured` sin
  variables, nunca `null` por error) y los Route Handlers de `/api/admin/juego/**` (401, validación
  repetida en el servidor, conflicto, audio rechazado).
- **Vitest + jsdom:** componentes de `/admin/juego` con lógica propia (lista de errores, conflicto).
- **Playwright:** contra el build. El navegador ya no habla con Supabase, así que no hay nada que
  interceptar en el cliente: en CI se corre **sin** variables de Supabase (estado «no disponible»,
  AC-SP4-8) y, para AC-SP4-2, con un servidor de pruebas de PostgREST simulado al que apunta
  `SUPABASE_URL` (o el mecanismo que el plan elija, sin tocar Supabase real). Un recorrido por fase.
- **SQL:** AC-SP3-1 a AC-SP3-6 y AC-SP8-2 como script de aserciones
  (`docs/saltapalabras-schema.test.sql`). Con RLS sin políticas y una sola función, el script es
  corto. **Cómo se corre en CI es la pregunta 3 de §14.** Hasta entonces se corre a mano y se
  registra la fecha en `docs/saltapalabras-pruebas.md`.
- **Contra Supabase real:** checklist manual en `docs/saltapalabras-pruebas.md` al cerrar cada fase,
  incluida la prueba de AC-SP3-11 (pausar el proyecto o cortar la red del servidor y comprobar que la
  página sigue sirviendo el último paquete).

**Terminado, por capacidad:** `pnpm check:task` pasa · `pnpm build` pasa y la tabla de rutas cumple
AC-SP4-1 · los AC de la capacidad tienen test o, si son SQL, ejecución registrada · probado en un
navegador real · sin regresiones en `completar-palabras`, diccionario, `solicitudes` ni
`edicion-fotos`.

---

## 12. Descartado el 2026-11-17

Diseñado en el primer borrador de este spec y descartado por la persona del proyecto: el proyecto
dura pocos meses y la edición es esporádica. Se deja descrito para retomarlo si el proyecto se
extiende; el primer borrador está en el historial de la rama.

| Qué                                                                 | Capacidad original | Motivo                                                                                                                                                                                     |
| ------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cuentas del equipo con Supabase Auth y enlace mágico                | SP5                | Necesita SMTP propio y gestión de cuentas; el Basic Auth de `/admin` alcanza para pocas personas.                                                                                          |
| `profiles` y roles `contributor` / `editor` / `admin`               | SP5                | Sin cuentas no hay roles; se compensa con historial, nota obligatoria y «Restaurar» (§9.2).                                                                                                |
| Navegador hablando directo con Supabase (clave pública + RLS + RPC) | SP3                | Una sola forma de acceso (servidor), igual que `solicitudes`; permite la caché que sobrevive a una pausa.                                                                                  |
| Editor web de paquetes con borradores en la nube                    | SP6                | Edición esporádica: el JSON se arma fuera del sitio y se importa. _El 2026-11-20 se retomó solo un editor mínimo sobre el paquete en preparación (SP6b, §9.5), sin borradores en la nube._ |
| «Probar mi borrador» en la página pública                           | SP4                | El juego es libre de login; la vista previa vive solo en `/admin/juego`.                                                                                                                   |
| Propuestas, diff campo por campo, aceptar / rechazar                | SP7                | Sin roles no hay quién proponga y quién apruebe; la revisión se hace fuera del sitio antes de importar.                                                                                    |
| Grabación en el navegador (MediaRecorder, 8 s)                      | SP8                | Los hablantes graban con su teléfono y el equipo sube el archivo.                                                                                                                          |
| Carpeta por usuario en el bucket `audio`                            | SP8                | Sin usuarios; el servidor es el único que escribe.                                                                                                                                         |

---

## 13. Límites

**Hacer siempre**

- Leer el doc de `node_modules/next/dist/docs/` antes de usar una API de Next que el repo no use ya
  (en particular `unstable_cache`, `revalidateTag`, ISR con `generateStaticParams` vacío).
- Pasar todo dato externo (base, archivo, `localStorage`) por `parsePack` o su esquema.
- Filtrar con `playableThemes` antes de mostrar nada en las rutas públicas.
- RLS activado sin políticas, `revoke all` antes de cada `grant`, y `grant` solo a `service_role` en
  cada tabla, vista o función nueva.
- Volver a validar en el servidor todo lo que llega de `/admin/juego`.
- Mostrar la fuente de cada palabra en el feedback.
- Correr `pnpm check:fast` al editar y `pnpm check:task` al cerrar.

**Preguntar primero**

- Cualquier dependencia nueva (motor de juegos, librería de diff, de auth, etc.).
- Cambiar CI (incluido agregar Postgres para las pruebas SQL).
- Tocar `solicitudes`, sus tablas o `supabase-admin.ts` más allá de importarlo.
- Cambiar el acceso de `/admin` de forma distinta a lo especificado en `edicion-fotos.md`.
- Tocar `src/lib/dictionary/**`, `src/lib/game/**` (más allá de importarlo) o el juego de
  completar palabras.
- Cambiar `help-education.tsx` o crear `/juegos` (§14, pregunta 5).
- Agregar una lengua a `languages.ts`.
- Habilitar Realtime o cualquier envío de datos a terceros.
- Usar voz sintética de otra forma que la de §7.7: **solo como provisional**, detrás de la grabación,
  con el aviso «Pronunciación aproximada» y el interruptor (2026-11-21). Nunca un servicio de voz en
  la nube: solo `speechSynthesis` del navegador, que no sale del dispositivo por nuestra parte.
- Agregar reglas de pronunciación (`tts.replace`) para una lengua originaria sin que las proponga
  una persona hablante o la fuente citada.
- Activar Cache Components (`cacheComponents`) en `next.config.ts`.
- **Agregar cualquier forma de login, cuenta o registro para quien juega.** Revierte la decisión #18
  y reabre el tratamiento de datos de menores (Ley 29733).
- Enlazar `/admin` desde una página pública, o cambiar el header.

**Nunca**

- **Inventar o generar con IA palabras, traducciones, frases de `praise` o grabaciones en una lengua
  originaria**, ni sembrar paquetes con ellas «para probar». Los fixtures de test usan palabras
  marcadas como de prueba, no lengua real inventada.
- Mostrar en una ruta pública un ítem no verificado o un paquete sin publicar.
- Poner la `service_role` key, `ADMIN_PASSWORD` o cualquier clave de Supabase en código de cliente o
  en una variable `NEXT_PUBLIC_`.
- Hacer que el navegador de quien juega hable con la API de datos de Supabase.
- Mandar fuera del navegador cualquier dato de quien juega.
- Publicar paquetes de uro, o mezclar variedades (ashéninka del Perené no es asháninka).
- Suprimir errores de tipos o lint, saltear o borrar tests, ni bajar un umbral de `CONSTRAINTS.md`.

---

## 14. Preguntas abiertas

| #   | Pregunta                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Quién decide                    | Bloquea                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------- |
| 1   | **Fuente para aimara.** No hay investigación de fuentes aimara en `docs/`. ¿Se hace un `docs/aimara-sources.md` como el de asháninka antes de agregarla a `languages.ts`?                                                                                                                                                                                                                                                                                                                     | Persona del proyecto            | Aimara, no el código.                                |
| 2   | ~~**Menores de edad.**~~ **Resuelta (2026-11-17):** quien juega no tiene cuenta ni login; el acceso interno es solo para personas adultas del equipo (decisiones #16 y #18).                                                                                                                                                                                                                                                                                                                  | Cerrada                         | Nada.                                                |
| 3   | **Pruebas SQL en CI.** Con RLS sin políticas y una sola función, el script es corto. Recomendación: un job con un servicio Postgres 16 que corre `docs/saltapalabras-schema.sql` + `…schema.test.sql` con `psql`, sin dependencias npm. Es cambiar CI, por eso se pregunta.                                                                                                                                                                                                                   | Persona del proyecto            | Nada en F1; recomendado antes de F2.                 |
| 4   | ~~¿Login con Google además del enlace mágico?~~ **Cerrada (2026-11-17):** no hay login de cuentas; el acceso interno es Basic Auth (decisión #17).                                                                                                                                                                                                                                                                                                                                            | Cerrada                         | Nada.                                                |
| 5   | ~~**Entrada desde el home.**~~ **Cerrada (2026-11-18, pedido de la persona del proyecto):** la tarjeta «Juegos» de la sección de educación de la portada (`src/components/help-education.tsx`) lista los dos juegos: «Aprende jugando →» (completar-palabras, sin cambiar su texto por AC-G4-16) y «Saltapalabras →», que lleva a la biblioteca `/juegos/saltapalabras`. No se crea `/juegos`: con dos juegos, una tarjeta con dos enlaces alcanza.                                           | Cerrada                         | Nada.                                                |
| 6   | **Primer paquete asháninka.** Lo natural es armarlo con palabras del vocabulario MINEDU que ya está citado en el diccionario, con emojis elegidos por el equipo y verificado con un hablante. ¿Quién lo arma y lo verifica? ¿Vale un botón «Importar del diccionario» en `/admin/juego`?                                                                                                                                                                                                      | Persona del proyecto + hablante | F1 sin contenido real (los tests no dependen de él). |
| 7   | ¿`ROUND_SIZE = 10` y sin vidas es lo correcto para niñas y niños pequeños, o conviene 6? Se decide viéndolo.                                                                                                                                                                                                                                                                                                                                                                                  | Se prueba en el navegador       | Nada. Es una constante.                              |
| 8   | **Retiro de un audio.** Si un hablante pide retirar su grabación, se quita del paquete, se publica una versión nueva y se borra el archivo del bucket; las versiones viejas del historial seguirán apuntando a una URL que ya no existe. ¿Es aceptable?                                                                                                                                                                                                                                       | Persona del proyecto            | Nada en código; antes de F3.                         |
| 9   | ~~**Moderación de spam.**~~ **Cerrada:** no hay registro ni propuestas; solo el equipo con la clave de `/admin` publica.                                                                                                                                                                                                                                                                                                                                                                      | Cerrada                         | Nada.                                                |
| 10  | ~~**Plan de Supabase.**~~ **Cerrada (2026-11-17): plan gratis.** Se acepta que, si el proyecto se pausa, publicar o subir audio falla y una lengua nunca generada muestra «no disponible» hasta reactivarlo a mano desde el panel. El juego ya generado sigue en pie por la caché (§6.4). Sin copias de seguridad automáticas: el historial `pack_versions` y la exportación de paquetes desde `/admin/juego` cubren la recuperación. `docs/saltapalabras-pruebas.md` incluye cómo reactivar. | Cerrada                         | Nada.                                                |

---

## 15. Aprobación

- [x] Revisión del 2026-11-17: servidor ↔ Supabase, juego sin login, `/admin` con Basic Auth, audio
      público, descartes (persona del proyecto)
- [ ] Diferencias con la referencia (§2)
- [ ] Mapa de capacidades y fases (§3)
- [ ] Formato del paquete y regla «solo verificado» (§4)
- [ ] Modos, distractores y ronda sin vidas (§5)
- [ ] Modelo de datos, función de publicación y caché (§6)
- [ ] Contrato de URL, pantallas y accesibilidad (§7)
- [x] Juego libre de login; acceso interno solo para personas adultas del equipo (decisiones #16 y
      #18, 2026-11-17)
- [ ] Acceso `/admin` reusado de `edicion-fotos.md` y privacidad (§8)
- [ ] `/admin/juego` y audio (§9–§10)
- [ ] Límites (§13)
- [ ] Preguntas que quedan abiertas: 1, 3, 5, 6, 8, 10 (ninguna bloquea el código de F1)
