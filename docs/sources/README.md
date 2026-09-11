# Fuentes descargadas

Copias locales de las obras que alimentan el diccionario, guardadas para que el contenido del
repositorio sea **auditable**: cualquiera debe poder comprobar de dónde salió una entrada, incluso si
la URL original cambia o desaparece.

**No se sirven en la web.** Viven en `docs/`, no en `public/`, a propósito: usar una obra como fuente
citada y _redistribuirla_ desde nuestro dominio son dos cosas distintas, y la segunda no está
decidida. Ver [../dictionary-sources.md](../dictionary-sources.md).

---

## `minedu-2021-vocabulario-pedagogico-ashaninka.pdf`

|                             |                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| **Título**                  | Ñantsipe Ayoyetajeri — Vocabulario pedagógico Ashaninka                                     |
| **Editor**                  | Ministerio de Educación del Perú — DIGEIBIRA, Dirección de Educación Intercultural Bilingüe |
| **Edición**                 | Primera edición, 2021 (impreso agosto 2021, tiraje 1300)                                    |
| **Autoría del contenido**   | Edinson Ysrael Huamancayo Curi, Elfren Gilberto Ramos Espíritu                              |
| **Revisión lingüística**    | Elfren Gilberto Ramos Espíritu                                                              |
| **Copyright**               | © Ministerio de Educación                                                                   |
| **Nota de la obra**         | «Distribuido gratuitamente por el Ministerio de Educación — prohibida su venta»             |
| **Descargado de**           | https://cdn.www.gob.pe/uploads/document/file/4976191/item_53_vocabulario_ashaninka.pdf      |
| **Ficha del repositorio**   | https://repositorio.minedu.gob.pe/handle/20.500.12799/7194                                  |
| **Fecha de descarga**       | 2026-09-11                                                                                  |
| **SHA-256**                 | `39ea99588b3fd6ca3ac660b7270d505c1e1f44cb3e54df30811d57b691c9dda8`                          |
| **Tamaño / páginas**        | 7.6 MB · 164 páginas                                                                        |
| **`sourceId` en los datos** | `minedu-2021-vocabulario-pedagogico`                                                        |

### Por qué esta fuente

1. **Es la que el proyecto puede usar limpiamente.** El trabajo es para el Estado y con el Estado, así
   que una obra del propio MINEDU es la vía más corta a un permiso formal — en curso, ver
   [../dictionary-sources.md](../dictionary-sources.md) §4. Las alternativas no servían: el
   diccionario del ILV/SIL es **CC BY-NC-ND** y el ND prohíbe justamente extraer entradas a una base
   de datos, y el corpus de AmericasNLP **no declara licencia** (verificado por la API de GitHub).
2. **Trae el alfabeto oficial**, no una grafía cualquiera. En su §1 documenta las 19 letras aprobadas
   por la **Resolución Directoral 0606-2008-ED** y la **Resolución Ministerial 303-2015-MINEDU**:
   `a b ch e i j k m n ñ o p r s sh t ts ty y`. De ahí sale la tabla de colación en
   `src/lib/dictionary/collation.ts`, y por eso `ch`, `sh`, `ts` y `ty` ordenan y agrupan como letras
   propias. Sin esta fuente el orden alfabético habría quedado mal.
3. **Su estructura calza con nuestro esquema `Entry`** sin forzar nada. Cada entrada de la Parte I
   trae: entrada léxica, clase de palabra (`b.` = _bairontsi_, sustantivo; `a.` = _antantsi_, verbo),
   glosa en castellano, y **ejemplos de uso en oración con su traducción** — que es exactamente el
   requisito central del pedido.
4. **El contenido está validado participativamente** con docentes asháninka, y la obra separa
   explícitamente lo consensuado (Partes I-III) de lo no aprobado (Parte IV, «Propuestas»). Eso nos
   permite importar solo lo consensuado.
5. **Es gratuita y de distribución pública**, coherente con un proyecto gratuito y sin fines
   comerciales.

### Qué NO importamos de aquí

- **La Parte IV («Propuestas»)**: son neologismos que los docentes **no** aprobaron ni consensuaron.
  La propia obra dice que se publican para que los hablantes los revisen, no como términos válidos.
- **La obra completa.** Copiar la lista íntegra de una sola obra infringe el copyright de compilación
  aunque cada par palabra→traducción suelto sea un hecho.
