# TODO — Gestor de contenido de lenguas

> Plan: [plan.md](./plan.md) · Spec: [specs/gestor-lenguas.md](../../specs/gestor-lenguas.md)
> Estado: **F1 hecha (2026-11-21)** y **F2 hecha (2026-11-22)** en la rama `feat/gestor-lenguas`.
> F3 en adelante, sin empezar.

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

- [ ] **T3.1** Palabras: editor de SP6b generalizado `[AC-L4-3]`
- [ ] **T3.2** Juegos: temas con selector de entradas
- [ ] **T3.3** Alfabeto y vista previa del orden `[AC-L4-4]`
- [ ] **T3.4** Fuentes `[AC-L4-5]`
- [ ] **T3.5** Teclado y 360 px `[AC-L4-6]`

## F4 — Retirar lo duplicado (L5)

- [ ] **T4.1** Migrar `language_packs` a `language_bundles`; retirar `/admin/juego`
- [ ] **T4.2** Retirar el alfabeto fijo y `src/data/dictionary/*` como fuente `[AC-L5-1]`

## Humanas

- [ ] **H1** Correr `docs/gestor-lenguas-schema.sql` en Supabase
- [ ] **H2** Preparar `uro.json` con `docs/gestor-lenguas/plantilla-uro.json` (fuentes, alfabeto,
      palabras verificadas)
