# Fuentes de oraciones para el juego — investigación y licencias

> Fecha: 2026-09-12 · Spec: [specs/completar-palabras.md](../specs/completar-palabras.md) §9
> Continúa: [dictionary-sources.md](./dictionary-sources.md), que ya cubrió las fuentes léxicas.
> **Veredicto: el juego se alimenta de la fuente ya importada y el contenido queda cerrado ahí.
> Ninguna candidata nueva está lista para usar.**

**Esto no es asesoría legal.** Es el registro de lo que dicen las fuentes, de cómo se comprobó y de
lo que no se pudo comprobar. Las decisiones las toma una persona.

---

## 1. Qué necesita el juego, que es distinto de lo que necesita el diccionario

El diccionario necesita **pares palabra → traducción**. Terreno firme incluso desde fuentes que no
nos dan licencia: que una palabra signifique lo que significa es un hecho, y lo citamos.

El juego necesita **oraciones**. Y una oración es expresión creativa, no un hecho. Es justo la parte
con riesgo real de copyright, la que `dictionary-sources.md` §5 recomendaba dejar para el final y
hacer con permiso explícito o con hablantes.

Dicho de otro modo: el juego se para sobre la parte más delicada del contenido. Por eso este
documento es más conservador que el del diccionario, no menos.

---

## 2. Lo que ya tenemos, y alcanza para lanzar

| Fuente                                                                                                                               | Estado                    | Qué aporta al juego                                           |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- | ------------------------------------------------------------- |
| [Ñantsipe Ayoyetajeri — Vocabulario pedagógico Ashaninka](https://repositorio.minedu.gob.pe/handle/20.500.12799/7194) (MINEDU, 2021) | Importada, citada, en uso | **148 ítems** jugables (147 entradas distintas). Ver spec §4. |

Son las oraciones de ejemplo que ya están en `src/data/dictionary/ashaninka.json`, cada una con su
`sourceId`. El juego no agrega contenido: reusa lo que el diccionario ya importó bajo la vía
institucional del proyecto con el Estado, y **muestra la cita en el feedback de cada ítem**, que es
más atribución de la que hace hoy el propio diccionario en su listado.

Copia local, motivos y ficha completa en [sources/README.md](./sources/README.md).

Ampliación de riesgo cero y sin licencia nueva: las **Partes II y III** de esa misma obra podrían
contener más oraciones de las 162 ya importadas. No se pudo verificar desde acá — esta máquina no
tiene `poppler` (`pdftotext`/`pdftoppm`), así que el PDF de 164 páginas no se pudo leer. Es la
primera cosa que conviene revisar si el pool se queda corto, y no necesita permiso de nadie.

---

## 3. Candidatas revisadas el 2026-09-12

Veredictos con el mismo vocabulario que `dictionary-sources.md` §2: `usable`, `solo-referencia`,
`requiere-permiso`, `requiere-verificacion`.

| #   | Fuente                                                                                                                                | Licencia declarada                             | Veredicto                                | Cómo se comprobó                                                                                                                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | [AILLA](https://ailla.utexas.org) — Archive of the Indigenous Languages of Latin America                                              | CC BY 3.0 a nivel de sitio; por ítem, variable | `requiere-verificacion`                  | Parcial. El sitio **bloquea el acceso automatizado** (403 en la búsqueda). No se intenta sortearlo. Necesita que una persona navegue las colecciones asháninka y lea el nivel de acceso de cada ítem.                           |
| 2   | Colección de textos **ashéninka del Perené** (Mihas, depositada en AILLA, 2009)                                                       | Depende del ítem                               | `solo-referencia` **por variedad**       | Sí, por la literatura: es **Ashéninka Perené / Alto Perené**, variedad distinta del asháninka de nuestro alfabeto oficial.                                                                                                      |
| 3   | [Repositorio MINEDU](https://repositorio.minedu.gob.pe) — otros materiales EIB en asháninka (cuadernos de trabajo, textos de lectura) | Ninguna declarada, distribución gratuita       | `requiere-permiso`                       | Parcial. El repositorio está detrás de un WAF que bloquea la consulta automatizada. La vía institucional ya abierta por la fuente 2 del diccionario cubriría también estos materiales.                                          |
| 4   | [Wikipedia Incubator `Wp/cni`](https://incubator.wikimedia.org/wiki/Wp/cni)                                                           | **CC BY-SA** (política de Wikimedia)           | `usable` pero **descartada por calidad** | Sí, se verificó la licencia. Es la única candidata con licencia limpia. Y aun así no entra: es texto comunitario sin revisión lingüística, sin garantía de seguir el alfabeto oficial y posiblemente con traducción automática. |
| 5   | [AmericasNLP 2021](https://github.com/AmericasNLP/americasnlp2021) — corpus paralelo es↔cni                                           | **Ningún archivo de licencia**                 | `requiere-permiso`                       | Ya verificado en `dictionary-sources.md` (API de GitHub: `license: null`). Sin licencia = todos los derechos reservados.                                                                                                        |
| 6   | [Diccionario asháninca](https://www.sil.org/resources/archives/29673) (ILV/SIL, 2008)                                                 | CC BY-NC-**ND** (según resultados de búsqueda) | `solo-referencia`                        | Ya revisado en `dictionary-sources.md`. El **ND** prohíbe justamente derivar una base de datos de ejercicios.                                                                                                                   |
| 7   | [Ñaa tsipeta](https://lengamer.org/publicaciones/diccionarios/Dic_Prelim_Ashaninka.pdf) (Lengamer)                                    | Desconocida                                    | `requiere-verificacion`                  | No. Pendiente desde el trabajo del diccionario: hay que abrir la página de créditos a mano.                                                                                                                                     |

### Por qué la 4 se descarta aunque su licencia sea la única limpia

Es la tentación obvia: CC BY-SA, sin pedir permiso a nadie. Pero el contenido de un wiki incubadora
no está validado por hablantes ni por lingüistas, y en wikis de lenguas con pocos editores es común
encontrar texto traducido a máquina. Meterlo en un juego que **enseña** convertiría un error
ortográfico de un editor anónimo en algo que alguien aprende como correcto.

El proyecto ya tiene escrita la regla que decide esto: es mejor la ausencia de dato que el dato falso.
Una licencia permisiva no vuelve confiable el contenido.

### Por qué la 2 se descarta aunque tenga las mejores oraciones

Es material excelente: narrativas completas, recogidas con hablantes y depositadas en un archivo
académico. Pero es **otra variedad**. El ashéninka del Perené tiene su propia ortografía, y nuestro
diccionario ordena y escribe según las 19 letras del alfabeto asháninka oficial (RD 0606-2008-ED,
RM 303-2015-MINEDU). Mezclarlas produciría un juego donde la palabra «correcta» depende de qué
fuente tocó, que es un error de datos disfrazado de más contenido.

Si en el futuro el sitio cubre ashéninka como lengua propia, esta fuente es el punto de partida
natural — pero como **otra lengua**, con su propio alfabeto, no revuelta con esta.

---

## 4. Nada descargado en esta ronda

`docs/sources/` sigue con un solo archivo. No se agregó ninguna obra porque ninguna candidata pasó a
`usable` con contenido confiable, y descargar una obra cuya licencia no está verificada no es un paso
neutro: es el primer paso hacia usarla.

Cuando una fuente se apruebe, el procedimiento ya está establecido por el diccionario: copia local en
`docs/sources/` (que **no** se sirve en la web), ficha con SHA-256, fecha de descarga, URL de origen y
motivos, más una fila en `src/data/dictionary/sources.json` para poder citarla desde los datos.

---

## 5. Qué desbloquearía más contenido, por relación esfuerzo/riesgo

> **Nada de esta sección es alcance del juego.** El juego se lanza con la fuente ya importada y su
> contenido está cerrado en los ejemplos del diccionario (spec §9, decisión #12). Lo que sigue es
> investigación para cuando alguien decida ampliar el **diccionario**; el juego heredaría el
> resultado sin tocar una línea de código.

1. **Leer las Partes II y III del PDF del MINEDU ya descargado.** Cero licencia nueva, cero permisos.
   Solo hace falta `brew install poppler` o una persona con el PDF abierto.
2. **Extender a estos materiales el permiso que ya se está pidiendo al MINEDU** por las fuentes 2 y 3
   del diccionario. Es la misma institución y la misma carta.
3. **Que una persona del proyecto navegue AILLA** y anote el nivel de acceso de las colecciones
   asháninka. Es el archivo con más posibilidades de tener algo con licencia explícita.
4. **Recoger oraciones con hablantes**, con consentimiento. Es lo más costoso y lo más valioso: sería
   contenido propio, sin licencia de terceros, y validado en origen.
5. **Preguntar a SIL** por un permiso expreso para uso educativo sin fines de lucro sobre la fuente 6.
   Suele concederse, y es el corpus más completo que existe.

---

## 6. La capa que no es legal

Se trata de conocimiento de un pueblo indígena. El permiso de una editorial no equivale al
consentimiento de la comunidad, y un juego es un uso más expuesto que un diccionario: pone las
palabras en una mecánica de acierto y error, con vidas que se pierden.

Vale la pena plantearlo a organizaciones asháninka (CARE, ARPI-SC, u organizaciones locales) antes de
difundir el juego, no después. Está anotado como pregunta abierta #1 del spec, junto con la revisión
del pool generado por un hablante o docente.

---

## Fuentes consultadas

- [AILLA — Archive of the Indigenous Languages of Latin America](https://ailla.utexas.org)
- [AILLA (legacy)](https://ailla-legacy.lib.utexas.edu/)
- [Wikipedia Incubator — Wp/cni (Asháninka)](https://incubator.wikimedia.org/wiki/Wp/cni)
- [Repositorio MINEDU — Ñantsipe Ayoyetajeri, vocabulario pedagógico Ashaninka](https://repositorio.minedu.gob.pe/handle/20.500.12799/7194)
- [Repositorio MINEDU — Cuadernos de trabajo](https://repositorio.minedu.gob.pe/handle/20.500.12799/6448)
- [AmericasNLP 2021](https://github.com/AmericasNLP/americasnlp2021)
- [Essentials of Ashéninka Perené Grammar (Mihas, 2010)](http://etnolinguistica.wdfiles.com/local--files/tese:mihas-2010/mihas_2010.pdf)
- [Archive of the Indigenous Languages of Latin America — Wikipedia](https://en.wikipedia.org/wiki/Archive_of_the_Indigenous_Languages_of_Latin_America)
- Registro previo del proyecto: [dictionary-sources.md](./dictionary-sources.md),
  [uro-language-sources.md](./uro-language-sources.md)
