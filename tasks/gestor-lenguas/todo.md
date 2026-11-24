# TODO — Gestor de contenido de lenguas

> Plan: [plan.md](./plan.md) · Spec: [specs/gestor-lenguas.md](../../specs/gestor-lenguas.md)
> Estado: **F1 hecha (2026-11-21)**, **F2 y F3 hechas (2026-11-22)** en la rama
> `feat/gestor-lenguas`. F4, sin empezar.

Cada tarea cierra con `pnpm check:fast`; cada fase, con `pnpm check:task` y e2e completos.

**Reglas que no se negocian:** nunca inventar palabras en asháninka ni en uro (fixtures «PRUEBA»);
nada sin verificar en una ruta pública; el navegador nunca habla con Supabase para datos; no se
tocan las líneas base ni los umbrales.

---

## F1 — El sitio lee los paquetes de lengua (L1 + L2 + L3)

### L1 — Formato

- [x] **T1.1** (M) `src/lib/language-bundles/types.ts` + `schema.ts` (`parseBundle`, zod, estricto
      como el JSON Schema; acepta e ignora `$schema`) `[AC-L1-1]`
- [x] **T1.2** (S) Test: el ejemplo y la plantilla pasan zod **y** el JSON Schema; los mismos casos
      inválidos fallan en los dos `[AC-L1-1, AC-L1-3]`
- [x] **T1.3** (M) `validate.ts` (`validateBundle`): errores y avisos de spec §4.2 `[AC-L1-1, AC-L1-2]`

### L2 — Datos y lectura

- [x] **T1.4** (M) `docs/gestor-lenguas-schema.sql` + `.test.sql`: `language_bundles`,
      `bundle_versions`, `publish_language_bundle`, permisos `[AC-L2-1]`
- [x] **T1.5** (M) `library.ts`: lectura cacheada por `language:<slug>`, respaldo del repo, error →
      lanza en producción / respaldo en build y dev `[AC-L2-2]`
- [x] **T1.6** (S) Supabase falso: `language_bundles` vacía por defecto

### L3 — Sitio

- [x] **T1.7** (M) Adaptadores: paquete → `Dictionary` + `Source[]` y paquete → `LanguagePack`,
      solo entradas verificadas `[AC-L3-2]`
- [x] **T1.8** (M) Orden con el alfabeto del paquete (`collation.ts` acepta el alfabeto como dato)
- [x] **T1.9** (M) `/diccionario/[lengua]` y su API leen del paquete; uro → «sin contenido»
      `[AC-L3-1, AC-L3-3]`
- [x] **T1.10** (S) `/juegos/completar-palabras/[lengua]` lee del paquete `[AC-L3-1, AC-L3-3]`
- [x] **T1.11** (M) `/juegos/saltapalabras/[lengua]`: paquete → `language_packs` → respaldo
      (plan §2.4); prerenderiza las dos lenguas; retira la excepción del uro `[AC-L3-3]`
- [x] **T1.12** (S) Cierre: `check:task`, e2e completos, tabla de `next build` `[AC-L3-1, AC-L3-3]`

## F2 — Subir y publicar (L4)

- [x] **T2.1** Publicación en el servidor (`publish_language_bundle`) + Route Handlers protegidos
      — `src/lib/language-bundles/{publishing,publish-request,admin-route}.ts` y
      `/api/admin/lenguas/[lengua]` (GET, `publicar`, `restaurar`, `versiones`,
      `versiones/[version]`). Cada handler vuelve a comprobar Basic Auth; publicar y restaurar
      invalidan solo `language:<slug>` con `revalidateTag(…, "max")`.
- [x] **T2.2** `/admin/lenguas` (lista) y `/admin/lenguas/[lengua]` con «Subir JSON», resumen de
      diferencias, «Probar», «Publicar», historial `[AC-L4-1, AC-L4-2]` — `bundle-file.ts`
      (importar, exportar, plantilla, `diffBundles`), `draft-storage.ts` y
      `src/components/admin/bundle-admin/`. e2e: `bundle-admin.spec.ts` (sin publicar) y
      `bundle-publish.spec.ts` (publica el uro; proyecto de Playwright que corre al final).
- [x] **T2.3** Tarjeta en `/admin` («Contenido de las lenguas»; la de `/admin/juego` sigue hasta F4)

## F3 — Editar (L4)

- [x] **T3.1** Palabras: búsqueda, filtros (sin verificar, sin dibujo, fuera del alfabeto), editar
      todos los campos, agregar, quitar, verificar por palabra y «las de esta lista» con quién
      verificó `[AC-L4-3]` — lógica en `edit-bundle.ts`, UI en `bundle-editor/`. No reusa los
      componentes de SP6b: aquel modelo guarda palabras dentro de cada tema; este, una sola lista
      con temas que la referencian (ver plan §8)
- [x] **T3.2** Juegos: temas (agregar, renombrar, icono, modo, quitar) con selector de entradas con
      búsqueda; aviso «no se puede jugar» por tema
- [x] **T3.3** Alfabeto: agregar, quitar, reordenar con teclado (el foco sigue a la letra), vocales,
      variantes, confusables, fuente; vista previa del orden `[AC-L4-4]`
- [x] **T3.4** Fuentes: editar, agregar; quitar una fuente citada se rechaza y dice quién la cita
      `[AC-L4-5]`
- [x] **T3.5** Teclado (pestañas WAI-ARIA, formularios, Escape) y 360 px; e2e de punta a punta que
      edita, publica y ve el cambio `[AC-L4-6]`

## F4 — Retirar lo duplicado (L5)

- [ ] **T4.1** Migrar `language_packs` a `language_bundles`; retirar `/admin/juego`
- [ ] **T4.2** Retirar el alfabeto fijo y `src/data/dictionary/*` como fuente `[AC-L5-1]`

## Humanas

- [ ] **H1** Correr `docs/gestor-lenguas-schema.sql` en Supabase
- [ ] **H2** Preparar `uro.json` con `docs/gestor-lenguas/plantilla-uro.json` (fuentes, alfabeto,
      palabras verificadas)
