# Edición de fotos: propuesta de interfaz

> Estado: **implementada** (UI-1 a UI-16, ver §8) · Fecha: 2026-11-18 · Spec: [specs/edicion-fotos.md](../specs/edicion-fotos.md)
> · Plan: [tasks/edicion-fotos/](../tasks/edicion-fotos/) · Mockup: `edicion-fotos-mockup.html` (scratchpad
> de la sesión; se puede copiar a `docs/` si el equipo lo quiere versionado)

> **Nota (2026-11-18, más tarde).** Las fotos pasaron de commits en GitHub a Supabase
> ([specs/edicion-fotos.md](../specs/edicion-fotos.md), «Cambios del 2026-11-18»). Guardar publica,
> así que **UI-8, UI-9 y UI-10 se simplificaron**: el progreso es «Foto preparada → Guardando y
> publicando…», el aviso dice «Ya está en la galería» con el enlace (sin espera de 1–2 minutos ni
> aviso de demora), y la lista no muestra una copia local «Publicando…». `PhotoEditor` recibe
> `version: number` en vez de `sha`. La confirmación de «Quitar» avisa que no se puede deshacer.

Esta propuesta mejora la pantalla `/admin/fotos` con el mismo commit por guardado. Las reglas de los
campos cambiaron el 2026-11-18 por pedido de la persona del proyecto (solo foto y descripción
obligatorias; ver §8 y [specs/edicion-fotos.md](../specs/edicion-fotos.md) §6.3). Cambia cómo se ve, en qué orden se hace cada cosa y qué
se le dice al editor mientras espera. Se implementa **después** de cerrar F2 y F3, encima de lo que
ya funciona.

---

## 1. Para quién

1 o 2 editores del equipo, sin conocimientos técnicos, **muchas veces desde el celular**, que suben
pocas fotos de vez en cuando. Lo que necesitan:

- Ver la foto **antes** de guardarla y saber que va a quedar bien.
- Llenar el crédito sin tener que saber de memoria cómo se escribe una licencia.
- Entender que «guardado» y «visible en la web» son dos momentos distintos (1–2 minutos).
- No romper nada por accidente: confirmar antes de quitar, y avisos claros si otra persona guardó.

---

## 2. Problemas de la UI actual

Leída en `src/components/admin/photo-editor.tsx` (estado al 2026-11-18, F2/F3 en curso).

| #   | Problema                                                                                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | **El formulario «Agregar foto» está al final**, debajo de toda la lista. En el celular, con 5–24 fotos, la acción principal queda a varias pantallas de distancia.                |
| P2  | **No hay vista previa.** El `<input type="file">` nativo muestra solo el nombre del archivo; el editor descubre si eligió la foto equivocada recién en la web, 2 minutos después. |
| P3  | **No se dice qué se va a guardar**: ni el tamaño final (≤ 2400 px), ni el peso, ni que se pierde la ubicación GPS (se dice en una línea gris arriba, fácil de pasar por alto).    |
| P4  | **El progreso tiene dos textos sueltos** («Reduciendo la foto…», «Guardando…») y el éxito dice «se verá en 1–2 minutos» sin forma de saber cuándo ya se ve.                       |
| P5  | **El crédito es texto libre.** «CC-BY-SA 4», «cc by sa 4.0» y «CC BY-SA 4.0» terminan como tres licencias distintas en la galería.                                                |
| P6  | **No hay contador de caracteres** en la descripción (10–300) ni en el pie (≤ 200): el editor se entera del límite al intentar guardar.                                            |
| P7  | **No se ve cuántas fotos hay** ni el máximo de 24 hasta que el servidor responde `gallery_full`.                                                                                  |
| P8  | **Cuatro botones del mismo peso por foto** («Subir», «Bajar», «Editar», «Quitar»). «Quitar» se ve igual que «Subir»; en el celular ocupan dos líneas por foto.                    |
| P9  | **El conflicto y GitHub caído** se muestran como un texto rojo genérico, sin acción («Recargar») ni explicación de que no se perdió nada.                                         |
| P10 | **Una foto recién guardada** muestra «Pendiente de publicar» en lugar de la imagen que el editor acaba de elegir, aunque el navegador la tiene.                                   |
| P11 | **Un solo componente de 721 líneas** mezcla lista, edición, borrado, alta y foco. Cuesta probarlo y cambiarlo (la guía de UI del repo pide partir a partir de ~200).              |

---

## 3. Propuesta por pantalla y estado

Todo vive bajo `/admin`; los visitantes no descargan nada de esto. Estética del sitio: fondo
`#FFF7E8`, superficies `#FBEFD2` y blanco, texto `#241D14` / `#4A4130`, acción `#E4572E` →
`#C7431C`, títulos en Baloo 2 y texto en Mulish (las mismas fuentes de `layout.tsx`). Radios y
sombras como la galería pública (`rounded-[20px]`, `shadow-[0_2px_0_rgba(36,29,20,0.08)]`). Sin
gradientes ni colores nuevos.

### 3.1 Cabecera de la galería

- Título «Fotos de la galería asháninka», contador **«5 de 24 fotos»** y el botón principal
  **«Agregar foto»** arriba a la derecha (en el celular, ancho completo debajo del título).
- Debajo, una línea fija: «Cada cambio se publica en la web en 1–2 minutos. Ver la galería ↗».
- Con 24 fotos el botón se deshabilita y el contador dice «24 de 24 · quita una para agregar otra».

### 3.2 Lista vacía

Una tarjeta `#FBEFD2` con el texto «La galería no tiene fotos todavía» y el mismo botón «Agregar
foto». Nunca una pantalla en blanco.

### 3.3 Lista con fotos

Cada foto es una fila (no una grilla de tarjetas: el orden importa y se lee de arriba abajo):

- **Número de posición** grande a la izquierda («1», «2»…), miniatura 4:3 y, al lado, descripción
  (dos líneas, el resto cortado con «…»), pie y crédito «Autor · Licencia».
- **Ordenar**: dos botones de flecha con texto accesible («Subir la foto 2», «Bajar la foto 2»),
  44 × 44 px, agrupados. El foco sigue a la foto a su nueva posición (ya implementado; se conserva).
- **Acciones**: «Editar» como botón secundario visible; «Quitar» como botón de texto rojo con
  icono de papelera, separado del resto para que no se toque por error. En el celular, ordenar y
  acciones caben en una sola línea.
- Una foto guardada pero aún no publicada muestra **la vista previa local** (la que el editor eligió)
  con una etiqueta «Publicando…» encima, en lugar del recuadro vacío.

### 3.4 Agregar foto

Al pulsar «Agregar foto» se abre un **panel en la misma página, arriba de la lista** (no un modal: no
hay trampa de foco que manejar, y en el celular se lee como una página más). El foco va al título
del panel. «Cancelar» lo cierra y devuelve el foco al botón.

**Paso 1 — Elegir la foto.** Una zona grande (mín. 160 px de alto) con borde punteado:
«Arrastra una foto aquí o **elige un archivo**». Es un `<label>` del `<input type="file">` real
(sin JavaScript para abrirlo), así funciona con teclado, lector de pantalla y, en el celular, ofrece
cámara o galería. Acepta JPEG, PNG o WebP.

**Paso 2 — Vista previa.** Apenas se elige, el navegador reduce la foto (ya lo hace `resizeToJpeg`)
y muestra:

- La imagen reducida, en la proporción real.
- «Se guardará así: **2400 × 1800 px · 1,2 MB · JPEG**», y «Se quitan los datos de ubicación (GPS)
  de la foto» con un icono de candado.
- «Cambiar foto» para volver a elegir.
- Sin herramienta de recorte: recortar exige una dependencia o mucho código y la galería ya muestra
  la foto entera. Si una foto necesita recorte, se recorta antes en el celular.

**Paso 3 — Datos.** Los mismos cinco campos de hoy, en este orden y con ayudas:

| Campo             | Ayuda                                                                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Descripción       | «Cuenta qué se ve, para quien no puede ver la foto.» Ejemplo debajo, en gris. Contador «42 / 300» que avisa por debajo de 10 y sobre 300. |
| Pie de foto       | Opcional. Contador «0 / 200».                                                                                                             |
| Autor             | «Quién tomó la foto.»                                                                                                                     |
| Licencia          | Botones de sugerencia que rellenan el campo: «CC BY-SA 4.0», «CC BY 4.0», «Dominio público», «Foto del equipo». Se puede escribir otra.   |
| Dirección (https) | «La página de donde sale la foto (por ejemplo, Wikimedia Commons).»                                                                       |

Junto a los campos, una **muestra de cómo se verá** en la galería pública: la foto, el pie y la
línea «Autor · Licencia» con el mismo estilo de `photo-gallery.tsx`.

**Paso 4 — Guardar y publicar.** Al pulsar «Guardar foto», una lista de etapas con `role="status"`:

1. ✓ Foto preparada (2400 × 1800 px)
2. ◌ Guardando en el repositorio…
3. ○ Publicando en la web (1–2 min)

Cada etapa cambia de icono **y** de texto (no solo de color). Al terminar la 2, el panel se cierra,
la foto aparece primera en la lista con «Publicando…» y la etapa 3 sigue en un aviso arriba. La
página comprueba cada 15 s si el archivo ya responde en la web (ver UI-9); cuando sí, el aviso pasa a
«✓ Ya se ve en la web. Ver la galería ↗». Si a los 5 minutos todavía no, dice «Tarda más de lo
normal. La foto está guardada; si no aparece en 10 minutos, avisa al equipo técnico.»

### 3.5 Errores

| Estado                   | Qué ve el editor                                                                                                                                                        |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Campo con problema       | Borde y texto en `#C7431C` con icono «!», mensaje debajo del campo enlazado con `aria-describedby`, y foco al primer campo con problema (ya implementado; se conserva). |
| Resumen de errores       | Si hay más de un campo mal, una caja arriba del formulario «Revisa 2 campos» con enlaces a cada uno.                                                                    |
| Foto ilegible o pesada   | El mensaje aparece en la zona de la foto, que vuelve al paso 1.                                                                                                         |
| Conflicto                | Caja `#FBEFD2` con icono: «Alguien guardó un cambio mientras editabas. Tu foto **no se perdió**: recarga la lista y vuelve a guardar.» Botón «Recargar la lista».       |
| GitHub caído / sin token | En lugar de la lista: «No pudimos leer la galería. No es un problema tuyo: avisa al equipo técnico.» Botón «Reintentar». Nunca un formulario vacío.                     |
| Sin conexión             | «No hay conexión. Tus datos siguen en el formulario; vuelve a intentar cuando tengas señal.» Los campos no se borran.                                                   |

En el conflicto, los datos del formulario y la foto reducida **se conservan** al recargar la lista,
para no obligar a llenarlo de nuevo.

### 3.6 Editar

**En la misma fila**, como hoy (no en un diálogo): el editor ve la foto mientras corrige el texto, y
no hay foco atrapado que manejar. Se mejora:

- Mismos campos, contadores y sugerencias de licencia que al agregar (un solo componente).
- «Guardar cambios» deshabilitado mientras no haya cambios, con el texto «Sin cambios».
- Escape cancela y devuelve el foco a «Editar».

### 3.7 Quitar

Confirmación en la fila, como hoy, con la miniatura repetida y el texto «¿Quitar esta foto de la
galería? También se borra el archivo. Se puede recuperar desde el historial del repositorio, pidiéndolo
al equipo técnico.» El foco va a «Cancelar» (ya implementado). «Sí, quitar» en rojo.

---

## 4. Mejoras numeradas

Cada una se implementa y se prueba por separado. «Test» indica dónde se verifica.

| ID    | Mejora                                                     | Criterio de aceptación                                                                                                                                                                                                                   | Test                             |
| ----- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| UI-1  | Cabecera con contador y botón «Agregar foto» arriba        | Con 5 fotos se lee «5 de 24 fotos» y «Agregar foto» es el primer botón después del título; con 24, el botón está deshabilitado y el texto explica por qué.                                                                               | Componente                       |
| UI-2  | Panel de alta arriba de la lista, no modal                 | Abrir el panel mueve el foco a su título; «Cancelar» lo cierra y devuelve el foco a «Agregar foto»; no hay `role="dialog"`.                                                                                                              | Componente                       |
| UI-3  | Zona para soltar o elegir archivo                          | La zona es un `<label>` del input de archivo: Enter/Espacio sobre ella abre el selector; soltar un archivo lo elige; mide ≥ 160 px de alto.                                                                                              | Componente + e2e                 |
| UI-4  | Vista previa con tamaño final, peso y aviso de GPS         | Tras elegir una foto de 4000 × 3000 se ve la imagen reducida y el texto «2400 × 1800 px», su peso en MB y el aviso de ubicación; «Cambiar foto» vuelve al paso 1.                                                                        | e2e (navegador)                  |
| UI-5  | Contadores de caracteres en descripción y pie              | El contador se actualiza al escribir, está enlazado al campo con `aria-describedby` y avisa en texto (no solo color) por debajo de 10 o sobre 300.                                                                                       | Componente                       |
| UI-6  | Sugerencias de licencia                                    | Hay 4 botones de sugerencia; pulsar uno escribe exactamente ese texto en «Licencia» y deja el foco en el campo; se puede escribir otra licencia a mano.                                                                                  | Componente                       |
| UI-7  | Muestra «Así se verá»                                      | La muestra repite pie y «Autor · Licencia» con el mismo marcado que `photo-gallery.tsx` y se actualiza al escribir.                                                                                                                      | Componente                       |
| UI-8  | Progreso por etapas                                        | Durante el guardado, un `role="status"` anuncia «Preparando la foto», «Guardando en el repositorio» y «Publicando en la web»; cada etapa tiene icono y texto, no solo color.                                                             | Componente                       |
| UI-9  | Detección de «ya se ve en la web»                          | Tras guardar, la página pide el archivo nuevo (`/peoples/ashaninka/<nombre>.jpg`, `cache: "no-store"`) cada 15 s; con la primera respuesta 200 anuncia «Ya se ve en la web»; a los 5 min deja de preguntar y muestra el aviso de demora. | Unit (reloj y `fetch` simulados) |
| UI-10 | Vista previa local para fotos «Publicando…»                | La foto recién guardada aparece primera en la lista con la imagen elegida (URL de objeto) y la etiqueta «Publicando…», no con el recuadro vacío; la URL se libera al publicarse.                                                         | Componente                       |
| UI-11 | Acciones de fila jerarquizadas                             | Por foto: flechas (≥ 44 × 44 px, con nombre accesible que incluye la posición), «Editar» secundario y «Quitar» en rojo con icono, separado; en 360 px de ancho caben en una línea.                                                       | Componente + e2e                 |
| UI-12 | Conflicto con «Recargar la lista» sin perder el formulario | Ante `version_conflict`, se ve el aviso con botón «Recargar la lista»; tras pulsarlo, la lista se actualiza y los campos y la foto del formulario siguen ahí.                                                                            | Componente                       |
| UI-13 | Resumen de errores                                         | Con 2 o más campos con problema aparece «Revisa N campos» con un enlace a cada campo; el foco va al resumen.                                                                                                                             | Componente                       |
| UI-14 | Editar: «Sin cambios» y Escape                             | Sin cambios, el botón está deshabilitado y dice «Sin cambios»; Escape cierra la edición y devuelve el foco a «Editar».                                                                                                                   | Componente                       |
| UI-15 | Partir `photo-editor.tsx`                                  | Ningún componente de `src/components/admin/` pasa de ~200 líneas; los tests existentes de F2/F3 siguen pasando sin cambios de comportamiento.                                                                                            | Suite existente                  |
| UI-16 | Celular                                                    | A 360 px no hay scroll horizontal, todos los objetivos táctiles miden ≥ 44 px y el flujo completo de alta se puede hacer con una mano (botón principal abajo del panel, ancho completo).                                                 | e2e (viewport)                   |

**Orden sugerido:** UI-15 primero (partir sin cambiar nada) → UI-1, UI-2, UI-3, UI-4 (el flujo de
alta) → UI-8, UI-9, UI-10 (la espera) → UI-5, UI-6, UI-7, UI-13 (los datos) → UI-11, UI-12, UI-14,
UI-16.

---

## 5. Componentes

Todos en `src/components/admin/`, en inglés y kebab-case. Reusan lo que ya existe en `src/lib/admin/`
(`photoFieldProblems`, `resizeToJpeg`, `MAX_GALLERY_PHOTOS`) y los primitivos de
`src/components/ui/` donde encajen (`button`, `input`, `textarea`, `label`, `snackbar`).

| Componente                 | Props                                                                                                             | Hace                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `PhotoEditor` (contenedor) | `photos: Photo[]`, `sha: string`                                                                                  | Estado de la galería, envíos al API, foco tras cada acción. Ya existe. |
| `GalleryHeader`            | `count: number`, `max: number`, `onAdd(): void`, `addDisabled: boolean`                                           | UI-1.                                                                  |
| `AddPhotoPanel`            | `sha: string`, `onSaved(answer): void`, `onClose(): void`                                                         | UI-2; orquesta los pasos 1–4.                                          |
| `PhotoDropzone`            | `onFile(file: File): void`, `problem?: string`, `disabled: boolean`                                               | UI-3.                                                                  |
| `PhotoPreview`             | `photo: ResizedPhoto`, `previewUrl: string`, `onChange(): void`                                                   | UI-4.                                                                  |
| `PhotoFieldInputs`         | `idPrefix`, `fields: PhotoFields`, `problems: PhotoFieldProblems`, `disabled`, `onChange(name, value)`            | Ya existe; suma contadores (UI-5) y sugerencias (UI-6).                |
| `CharacterCount`           | `id: string`, `length: number`, `min?: number`, `max: number`                                                     | UI-5.                                                                  |
| `LicenseSuggestions`       | `onPick(license: string): void`, `disabled: boolean`                                                              | UI-6. Lista fija en `src/lib/admin/license-suggestions.ts`.            |
| `GalleryCardPreview`       | `src: string`, `fields: PhotoFields`                                                                              | UI-7.                                                                  |
| `ErrorSummary`             | `problems: Partial<Record<string, string>>`, `idPrefix: string`                                                   | UI-13.                                                                 |
| `SaveProgress`             | `stage: "preparing" \| "saving" \| "publishing" \| "published" \| "slow" \| "failed"`, `size?: { width; height }` | UI-8.                                                                  |
| `usePublishWatch` (hook)   | `src: string \| null`, `{ intervalMs = 15000, timeoutMs = 300000, fetchImpl = fetch }`                            | UI-9. Devuelve `"waiting" \| "published" \| "slow"`.                   |
| `PhotoRow`                 | `photo`, `position`, `total`, `pending: boolean`, `localPreview?: string`, callbacks de mover/editar/quitar       | UI-10, UI-11.                                                          |
| `ReorderButtons`           | `position: number`, `total: number`, `disabled: boolean`, `onMove(direction): void`                               | UI-11.                                                                 |
| `RemoveConfirmation`       | `position: number`, `onConfirm(): void`, `onCancel(): void`, `disabled: boolean`                                  | Ya existe dentro de la fila; se extrae.                                |
| `EditPhotoForm`            | `photo`, `disabled`, `onSave(fields)`, `onCancel()`                                                               | Ya existe; suma UI-14.                                                 |
| `GalleryNotice`            | `kind: "conflict" \| "unavailable" \| "offline"`, `onRetry(): void`                                               | UI-12 y estados de §3.5.                                               |

---

## 6. Dependencias

**Ninguna nueva.** La zona para soltar usa los eventos nativos de arrastre sobre un `<label>`, la
vista previa usa `URL.createObjectURL`, los iconos salen de `lucide-react` (ya instalado) y la
detección de publicación es un `fetch` al mismo origen. No hace falta librería de recorte (se
descarta el recorte) ni de arrastrar para ordenar (se ordena con botones, accesible por teclado).

---

## 7. Riesgos y preguntas

| #   | Riesgo o pregunta                                                                                                                                                                 | Propuesta                                                                                                                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | ~~«Foto del equipo» no tiene página de origen~~ **Resuelto el 2026-11-18:** la URL de origen es opcional en todo el sitio. Sin ella, el crédito se muestra como texto sin enlace. | Hecho: `PhotoCredit.url?`, `validatePeople` (https si está), `PhotoCaption` compartido por la galería y la vista previa.                             |
| R2  | **Fotos HEIC del iPhone.** iOS suele convertirlas a JPEG al elegirlas en un `<input>` que no acepta HEIC, pero no siempre.                                                        | Verificar en un iPhone real durante H3. Si llega HEIC, el mensaje de UI-3 dice «Esta foto está en formato HEIC: en el iPhone, compártela como JPEG». |
| R3  | **UI-9 depende de que el 404 del archivo no quede en caché** en la CDN de Vercel.                                                                                                 | `cache: "no-store"` y un tope de 5 minutos; si la detección falla, el editor ve el aviso de demora, no un error.                                     |
| R4  | **Conservar el formulario tras un conflicto** obliga a separar «recargar la lista» de «reiniciar el panel».                                                                       | Lo resuelve el estado del panel en `AddPhotoPanel`, independiente del de la lista.                                                                   |
| R5  | **Partir el componente (UI-15) mientras F3 sigue abierto** puede chocar con el otro trabajo.                                                                                      | Empezar solo después de cerrar el checkpoint de F3.                                                                                                  |
| R6  | **Cobertura del cambio (≥ 80 %)**: la parte de canvas y de arrastrar no corre en jsdom.                                                                                           | La lógica pura (formato de tamaños, etapas, `usePublishWatch`) va en funciones con unit test; lo visual, en e2e.                                     |

---

## 8. Estado de la implementación (2026-11-18)

Implementado en `feat/edicion-fotos` sobre `eb24bec`, sin dependencias nuevas.

| ID    | Estado | Dónde / cómo se prueba                                                                                                              |
| ----- | ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| UI-1  | Hecho  | `gallery-header.tsx` · `editor-parts.test.tsx`, `photo-editor.test.tsx`                                                             |
| UI-2  | Hecho  | `add-photo-panel.tsx` · `photo-editor.test.tsx` («the panel»)                                                                       |
| UI-3  | Hecho  | `photo-dropzone.tsx` · `editor-parts.test.tsx` (soltar, input real) + e2e «the keyboard opens the photo picker»                     |
| UI-4  | Hecho  | `photo-preview.tsx`, `use-prepared-photo.ts` · `photo-editor.test.tsx` + e2e (4000 × 3000 → «2400 × 1800 px»)                       |
| UI-5  | Hecho  | `character-count.tsx` · `editor-parts.test.tsx`                                                                                     |
| UI-6  | Hecho  | `license-suggestions.tsx` · `photo-editor.test.tsx`                                                                                 |
| UI-7  | Hecho  | `gallery-card-preview.tsx` con `PhotoCaption` (el mismo componente de la galería pública) · `photo-editor.test.tsx`                 |
| UI-8  | Hecho  | `save-progress.tsx` · `editor-parts.test.tsx`                                                                                       |
| UI-9  | Hecho  | `src/lib/admin/publish-watch.ts` + `publish-notice.tsx` · `publish-watch.test.ts` (reloj simulado), `photo-editor-publish.test.tsx` |
| UI-10 | Hecho  | `Thumbnail` en `photo-row-parts.tsx` · `photo-editor-publish.test.tsx`                                                              |
| UI-11 | Hecho  | `photo-row.tsx`, `photo-row-parts.tsx` · `photo-editor-rows.test.tsx`                                                               |
| UI-12 | Hecho  | `gallery-notice.tsx` (`SaveFailureNotice`) · `photo-editor.test.tsx`, `photo-editor-rows.test.tsx`                                  |
| UI-13 | Hecho  | `error-summary.tsx`, `form-problems.ts` · `photo-editor.test.tsx`                                                                   |
| UI-14 | Hecho  | `edit-photo-form.tsx` · `photo-editor-rows.test.tsx`                                                                                |
| UI-15 | Hecho  | `photo-editor.tsx` pasó de 721 líneas a un contenedor y 21 módulos en `src/components/admin/`; ver desvío 1                         |
| UI-16 | Hecho  | e2e «the editor fits a phone and its buttons are big enough» (360 px, sin scroll lateral, botones ≥ 44 × 44 px)                     |

**Cambios de datos del 2026-11-18** (pedidos por la persona del proyecto, aplicados de punta a punta):
solo la foto y la descripción son obligatorias; autor y licencia vienen prellenados con
«Living Langs Peru» · «Foto del equipo» y vuelven a ese valor si quedan vacíos
(`withCreditDefaults`, cliente y servidor); la URL de origen es opcional y, sin ella, el JSON no lleva
`url` y la galería pública muestra la licencia como texto.

**Desvíos respecto de la propuesta**

1. **UI-15:** dos archivos pasan un poco de 200 líneas con imports y comentarios
   (`add-photo-panel.tsx` ~227, `photo-editor.tsx` ~215). La lógica separable ya está en hooks
   (`use-prepared-photo.ts`, `use-row-focus.ts`); partirlos más separaría estado que va junto.
2. **Lista vacía (§3.2):** no repite el botón «Agregar foto»; el texto remite al de la cabecera.
   Dos botones con el mismo nombre confunden a un lector de pantalla.
3. **Foco tras guardar una foto:** va al aviso de publicación (`role="status"`), que dice el
   resultado y lleva el enlace a la galería.
4. **«Ya se ve en la web» (UI-9):** pregunta con `HEAD` al archivo nuevo. En local (`pnpm dev`) el
   archivo nunca aparece, porque el commit va a GitHub y no a la carpeta local: a los 5 minutos se
   ve el aviso de demora. Es lo esperado fuera de Vercel.
5. **Peso en MB:** la coma decimal se escribe a mano (`describePhotoSize`), como hace
   `formatCount`, porque el separador de `Intl` depende del ICU de cada máquina.

**Sin verificar en este entorno:** Safari real (iPhone/macOS) y fotos HEIC (R2), lectores de
pantalla reales (NVDA, VoiceOver), y la detección de publicación contra un despliegue real de
Vercel (R3).
