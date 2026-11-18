# Saltapalabras — documento de referencia (externo)

> Fecha de recepción: 2026-11-17 · Uso: **referencia de diseño del juego**, no especificación.
> La especificación vigente es [specs/saltapalabras.md](../specs/saltapalabras.md). Donde ambos
> difieren, manda el spec; las diferencias y su porqué están en su §2.

Se conserva tal como llegó, sin editar, para que se pueda rastrear de dónde salió cada idea. Describe
un prototipo en un `index.html` estático con supabase-js desde CDN; el proyecto lo reimplementa en
Next.js con las reglas de [CONSTRAINTS.md](../CONSTRAINTS.md).

---

# Saltapalabras · Lenguas originarias — Spec técnica (v1, Supabase)

Juego web de vocabulario para **todas las edades** que promueve el aprendizaje de lenguas originarias del Perú. Cada lengua es un **paquete JSON**. La comunidad edita y propone cambios, los editores publican, y todo queda versionado.

---

## 1. Arquitectura

```
Navegador (index.html estático, sin build)
 ├─ Juego (canvas) ─ lee el paquete activo
 ├─ Panel ⚙️ ─ Lenguas · Editar · Ajustes · Progreso · Formato JSON
 ├─ localStorage ─ copia local y modo sin sesión
 └─ supabase-js v2 (CDN)
       ├─ Auth ─ enlace mágico por correo, Google (opcional)
       ├─ Postgres + RLS ─ profiles, packs, pack_versions, drafts, proposals, progress
       ├─ RPC (SECURITY DEFINER) ─ publish_pack, accept_proposal, reject_proposal, restore_pack_version
       ├─ Realtime ─ packs, proposals
       └─ Storage ─ bucket público `audio`
```

- **Hosting:** cualquier hosting estático (Vercel, Netlify, Cloudflare Pages, GitHub Pages). No se puede publicar como artifact de claude.ai, porque bloquea las conexiones a otros dominios.
- **Sin backend propio:** la seguridad está en RLS y en las RPC. La anon key es pública por diseño.
- **Funciona sin Supabase:** si `CFG` no está configurado, el juego corre en modo local (localStorage) con el aimara incluido.

---

## 2. Roles

| Rol                 | Cómo se obtiene                                          | Puede                                                                                                           |
| ------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `anon` (sin sesión) | —                                                        | Jugar, ver la biblioteca, editar y guardar en su navegador, descargar el .json                                  |
| `learner`           | Al registrarse (trigger `handle_new_user`)               | Lo anterior + progreso y borradores en la nube + enviar propuestas + subir audios a su carpeta                  |
| `editor`            | Lo asigna un admin (`update profiles set role='editor'`) | Lo anterior + publicar, aceptar o rechazar propuestas, restaurar versiones, ver todas las propuestas y perfiles |
| `admin`             | Manual en SQL (ver `schema.sql`, al final)               | Igual que editor; reservado para gestionar roles                                                                |

Nadie puede subirse el rol a sí mismo: la política `profiles_update` exige `role = my_role()`.

---

## 3. Modelo de datos

| Tabla                              | PK                       | Contenido                                                                                                  | Lectura                          | Escritura                                                               |
| ---------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------- |
| `profiles`                         | `id` (= `auth.users.id`) | `display_name`, `role`, `settings` jsonb, `active_code`, `updated_at`                                      | La propia persona y los editores | La propia persona (sin cambiar `role`)                                  |
| `packs`                            | `code`                   | Versión publicada actual: `name`, `version`, `pack` jsonb, `updated_by`, `updated_at`                      | Todos, incluido `anon`           | Solo por RPC                                                            |
| `pack_versions`                    | `(code, version)`        | Historial inmutable: `pack`, `note`, `published_by`, `published_at`                                        | Todos                            | Solo por trigger `packs_history`                                        |
| `drafts`                           | `(user_id, code)`        | Borrador privado: `pack`, `base_version`, `saved_at`                                                       | Su dueña/o                       | Su dueña/o                                                              |
| `proposals`                        | `id` uuid                | `code`, `user_id`, `pack`, `base_version`, `note`, `status` (pending/accepted/rejected), datos de revisión | El autor y los editores          | El autor inserta y edita mientras está `pending`; los editores, por RPC |
| `progress`                         | `(user_id, code)`        | `stats` jsonb por palabra: `{seen, first, miss, w, e, h, last}`                                            | Su dueña/o                       | Su dueña/o                                                              |
| `storage.objects` (bucket `audio`) | —                        | Grabaciones (máx. 2 MB; webm, ogg, mp3, m4a, wav, aac)                                                     | Público                          | Cada quien en `audio/<uid>/…`; borrar: el dueño o los editores          |

**Restricciones:**

- `code ~ '^[a-z0-9_-]{2,30}$'`.
- Un `pack` debe tener `language` y un `themes` que sea array, y pesar menos de 2 MB.
- Solo puede haber **una propuesta pendiente por persona y lengua** (índice único parcial).

**Vista `pack_words`** (`security_invoker`): una fila por palabra publicada, para análisis. Ejemplos: palabras sin verificar por lengua, cobertura de audio.

**Por qué el paquete va en jsonb y no normalizado:** el paquete es la unidad que se edita, versiona, exporta y valida. Normalizar en tablas `themes` y `words` complica los diffs y el historial sin dar ventaja a esta escala. La vista `pack_words` cubre las consultas.

---

## 4. RPC

| Función                                                            | Quién    | Qué hace                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `publish_pack(p_code, p_pack, p_expected_version?, p_note?) → int` | Editores | Crea (v1) o publica la versión N+1. Usa concurrencia optimista: si `p_expected_version` ≠ versión actual, lanza `40001 conflict` y no pisa cambios ajenos. Con `null` publica a la fuerza. Lanza `22023` si el `language.code` del JSON no coincide con `p_code`. |
| `accept_proposal(p_id, p_note?) → int`                             | Editores | Publica el paquete de la propuesta y la marca `accepted`.                                                                                                                                                                                                         |
| `reject_proposal(p_id, p_note?)`                                   | Editores | La marca `rejected`; queda en el historial.                                                                                                                                                                                                                       |
| `restore_pack_version(p_code, p_version) → int`                    | Editores | Vuelve a publicar una versión antigua como versión nueva (no reescribe la historia).                                                                                                                                                                              |

`EXECUTE` está revocado para `public` y `anon` y concedido a `authenticated`; además, cada función comprueba `is_editor()`.

---

## 5. Flujos

**Jugar.** Se carga `packs` y se suscribe por Realtime. El paquete activo se elige así, por prioridad: **borrador propio > biblioteca > aimara incluido**. El progreso se guarda en localStorage y, con un _debounce_ de 1,2 s, en `progress` y `profiles.settings`.

**Editar.** En ✏️ Editar se modifica una copia del paquete. Al guardar se ejecutan `cleanPack` (normaliza ids y quita palabras vacías) y `validatePack`, y se hace upsert en `drafts`, guardando `base_version`, que es la versión de biblioteca sobre la que se editó.

**Proponer** (learner). Primero guarda el borrador y luego inserta o actualiza su propuesta `pending` con una nota.

**Revisar** (editor). En 🌐 Lenguas aparece la lista de propuestas con su diff (＋ añadidas, － quitadas, ✎ cambiadas, incluidos los cambios de traducción, emoji, verificación y audio). Puede:

- **Aceptar:** llama a `accept_proposal`.
- **Revisar:** abre la propuesta en el editor, la corrige y la publica.
- **Rechazar:** llama a `reject_proposal`.

**Publicar** (editor). Llama a `publish_pack` con `expected = base_version`.

- Si hay conflicto, avisa y ofrece "publicar igual".
- Si sale bien, borra el borrador y Realtime actualiza a todos los conectados.

**Audio.** En cada palabra se puede 🎙️ grabar (MediaRecorder, máx. 8 s) o 📎 subir un archivo. Se guarda en `audio/<uid>/<code>/<uuid>.<ext>` y la URL pública queda en `items[].audio`. Al jugar, si una palabra tiene audio se reproduce ese en lugar de la voz sintética.

**Sesión.** Al iniciar sesión se hace un merge entre lo local y la nube:

- Los ajustes y el progreso más recientes ganan, comparando `updated_at` con `S.updated`.
- De los borradores gana el más reciente por `saved_at`, y los que solo existen en local se suben.

---

## 6. Formato del paquete (`pip-lang-pack/1`)

El schema completo está en `pip-lang-pack.schema.json`. Campos clave:

```jsonc
{
  "schema": "pip-lang-pack/1",
  "language": {
    "code": "cni",
    "name": "Asháninka",
    "title": "Aprende asháninka",
    "about": { "region": "", "family": "", "speakers": "", "notes": "" },
    "vowels": ["a", "e", "i", "o"], // modo "Falta la vocal"
    "vowelVariants": { "á": "a" },
    "graphemes": ["ch", "sh", "ts", "ty", "a", "…"], // modo "Letra inicial"; incluir dígrafos
    "confusable": { "ts": ["ch", "s"] }, // distractores
    "translationLabel": "castellano",
    "tts": { "lang": "es-PE", "quality": "approx", "replace": [["'", ""]] }, // native | approx | off
    "praise": { "correct": "", "wrong": "", "win": "" },
  },
  "source": { "name": "", "url": "", "notes": "", "reviewedBy": "" },
  "themes": [
    {
      "id": "animales",
      "name": "Animales",
      "nameNative": "",
      "icon": "🐶",
      "mode": "pic2word", // pic2word | listen | word2pic | first | vowel
      "items": [
        {
          "word": "",
          "translation": "perro",
          "emoji": "🐶",
          "sourceRef": "p. 112",
          "verified": false,
          "audio": "https://…/audio/<uid>/cni/x.webm",
        },
      ], // o data:audio/…
    },
  ],
}
```

**Reglas de validación** (`validatePack`, en el cliente):

- Errores: `pic2word`, `listen` y `word2pic` necesitan al menos 3 palabras distintas; `word2pic` además necesita 3 dibujos distintos.
- Avisos: palabras sin emoji, palabras sin vocal en el modo `vowel`, palabras cuya inicial no está en `graphemes`, y audio que no sea `https` ni `data:audio`.

---

## 7. Puesta en marcha

1. **Crea el proyecto** en Supabase y ejecuta `schema.sql` en el SQL Editor.
2. **Configura Auth:** en Auth → URL Configuration pon tu dominio en _Site URL_ y en _Redirect URLs_. Google es opcional: actívalo en Auth → Providers.
3. **Conecta el juego:** en `index.html`, busca `const CFG=` y pon la `url` y la `anonKey` (Project Settings → API).
4. **Despliega** `index.html` en un hosting estático.
5. **Hazte admin:** regístrate en la app y ejecuta el `update … role='admin'` del final de `schema.sql`.
6. **Primer contenido:** en ✏️ Editar → aimara → 🌍 Publicar (crea `packs.aym` v1). Carga y publica asháninka y uro cuando estén revisados.

---

## 8. Límites y decisiones abiertas

- **Voz:** no hay voz sintética para lenguas originarias; la voz "aproximada" usa es-PE con reglas `replace`. La solución real son las grabaciones de hablantes (`audio`).
- **Contenido generado con IA:** siempre entra como borrador con `verified: false`. Solo un hablante o un editor debe marcarlo como verificado.
- **Moderación de audio:** cualquier persona con sesión puede subir audio a su carpeta. Los audios solo llegan a la biblioteca si un editor acepta la propuesta. Si hace falta, se puede limitar la subida a editores cambiando `audio_insert_own`.
- **Tamaño:** un paquete pesa menos de 2 MB porque el audio va en Storage y en el JSON solo queda la URL.
- **Por definir:** moderación de spam en propuestas (rate-limit con Edge Function), UI de historial y restauración (la RPC ya existe), estadísticas públicas con `pack_words`, y la decisión sobre si `anon` puede jugar sin cuenta (hoy sí).

---

## 9. Pruebas hechas

- **`schema.sql`:** ejecutado en Postgres 16 con stubs de `auth` y `storage`. Se comprobó:
  - un learner no puede publicar ni escribir en `packs` ni subirse el rol;
  - los borradores son privados (ni el admin los ve);
  - solo hay una propuesta pendiente por lengua;
  - la RLS de audio por carpeta funciona;
  - aceptar crea v1, publicar crea v2, el conflicto se detecta y restaurar crea v3;
  - `anon` lee la biblioteca y no puede ejecutar las RPC.
- **`index.html`:** probado en un navegador automático con un mock de supabase-js: un learner edita, sube audio y propone; el admin acepta; aparece el conflicto de versión, se publica igual; `anon` ve el formulario de login y la biblioteca. **No probado** contra un proyecto Supabase real.
