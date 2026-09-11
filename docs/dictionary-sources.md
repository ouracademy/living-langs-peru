# Fuentes del diccionario — investigación y licencias

> Tarea T7.1 · Fecha: 2026-09-11 · Spec: [specs/diccionario.md](../specs/diccionario.md) §8
> Estado: **decidido e importado.** La fuente 2 (MINEDU) está en uso; el permiso formal está en
> trámite por la vía institucional del proyecto con el Estado.

**Esto no es asesoría legal.** Es un registro de lo que dicen las fuentes y de lo que no se pudo
comprobar. Las decisiones de §4 las toma una persona.

---

## 1. El marco de este proyecto

Es un proyecto **público, gratuito y sin fines comerciales**, con la UNMSM y el Ministerio de Cultura
ya presentes como aliados en la propia página. Eso cambia tres cosas:

| Restricción                | ¿Nos afecta?                                                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **NC** (no comercial)      | **No.** La cumplimos de fábrica. Una fuente CC BY-NC o CC BY-NC-SA es usable con atribución.                                                            |
| **BY** (atribución)        | **No.** Vamos a citar la fuente de cada entrada de todos modos: el esquema ya tiene `sourceId`.                                                         |
| **ND** (sin derivadas)     | **Sí, y es el bloqueo real.** Extraer entradas a una base de datos buscable es una obra derivada. El ND lo prohíbe aunque el uso sea gratuito y citado. |
| **Sin licencia declarada** | **Sí.** Por defecto son todos los derechos reservados. Ser sin ánimo de lucro no crea una licencia que no existe: hay que pedirla.                      |

### La distinción que de verdad importa

El copyright de un diccionario no cubre el **hecho** de que una palabra signifique lo que significa.
Cubre la **selección, el orden y la redacción** de sus definiciones y ejemplos.

- **Pares palabra → traducción**, compilados de varias fuentes y ordenados por nosotros: terreno
  firme, incluso desde fuentes que no nos dan licencia, siempre que citemos de dónde salen.
- **Oraciones de ejemplo**: expresión creativa. Aquí sí hay riesgo. Preferimos ejemplos con permiso
  explícito, o recogidos con hablantes.
- **Copiar la lista completa de una sola obra**: infringe el copyright de compilación aunque cada par
  suelto sea un hecho. No lo hacemos.

### La capa que no es legal

Se trata de conocimiento de un pueblo indígena. El permiso de una editorial no es lo mismo que el
consentimiento de la comunidad. Vale la pena que alguien del proyecto lo plantee a las organizaciones
asháninka, sobre todo para las oraciones de ejemplo y las grabaciones que vengan después.

---

## 2. Veredictos

- `usable` — la licencia permite reutilizar y adaptar con atribución sin uso comercial.
- `solo-referencia` — se puede enlazar y citar, **no** extraer a la base de datos (típicamente ND).
- `requiere-permiso` — sin licencia declarada; hay que pedirla por escrito.
- `requiere-verificacion` — no se pudo comprobar la licencia desde aquí.

---

## 3. Fuentes candidatas

| #   | Fuente                                                                                                                       | Institución         | Licencia declarada                            | Veredicto               | Comprobado                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------- | --------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | [Diccionario asháninca](https://www.sil.org/resources/archives/29673) (2008)                                                 | ILV / SIL           | CC BY-NC-ND 3.0, según resultados de búsqueda | `solo-referencia`       | **No.** La página devuelve HTTP 403. Confirmar en el PDF o escribiendo a SIL.                               |
| 2   | [Ñantsipe Ayoyetajeri — Vocabulario pedagógico Ashaninka](https://repositorio.minedu.gob.pe/handle/20.500.12799/7194) (2021) | MINEDU              | **Ninguna** en la página del repositorio      | `requiere-permiso`      | Sí. Revisada la ficha; no hay declaración de derechos.                                                      |
| 3   | [Diccionario visual en lengua originaria Asheninka](https://repositorio.minedu.gob.pe/handle/20.500.12799/7545)              | MINEDU              | Ninguna en la página                          | `requiere-permiso`      | Parcial. Ojo: es **asheninka**, variedad distinta del asháninka.                                            |
| 4   | [Ñaa tsipeta — Diccionario preliminar asháninka](https://lengamer.org/publicaciones/diccionarios/Dic_Prelim_Ashaninka.pdf)   | Lengamer            | Desconocida                                   | `requiere-verificacion` | No. El PDF no se pudo extraer automáticamente; hay que abrir la página de créditos a mano.                  |
| 5   | [AmericasNLP 2021](https://github.com/AmericasNLP/americasnlp2021) — corpus paralelo es↔cni                                  | Consorcio académico | **Ningún archivo de licencia**                | `requiere-permiso`      | Sí, vía API de GitHub: `license: null`. Sin licencia = derechos reservados.                                 |
| 6   | [Wikidata Lexemes](https://www.wikidata.org/wiki/Wikidata:Lexeme) para `cni`                                                 | Wikimedia           | CC0 por política                              | `usable`                | Política sí; **cobertura no**. Hay que consultar cuántos lexemas `cni` existen: probablemente casi ninguno. |

Notas sobre la 5: son oraciones paralelas, no un diccionario. Sirven mejor para **ejemplos de uso**
que para entradas. Sus fuentes subyacentes son Ortega et al. (2020), Cushimariano Romano & Sebastián Q.
(2008) y Mihas (2011) — conviene ir a ellas directamente en lugar de al agregado.

---

## 4. Decisiones pendientes (hito H2)

Ninguna la puede cerrar la IA.

1. **Confirmar la licencia de la 1.** Si es realmente ND, queda como referencia citada, no como
   fuente de datos. Es la fuente más completa que existe, así que vale la pena preguntar a SIL si
   dan permiso expreso para un uso educativo sin fines de lucro. Muchas veces lo dan.
2. **Escribir a MINEDU** (`repositorio@minedu.gob.pe`, y DIGEIBIRA) por las 2 y 3. Este es el camino
   más corto a un sí limpio: el proyecto ya exhibe al Ministerio de Cultura como aliado, así que la
   petición no llega en frío.
3. **Revisar a mano la página de créditos de la 4.**
4. **Medir la cobertura real de Wikidata** para `cni` antes de invertir en un importador para ella.
5. **Plantear el consentimiento comunitario** a organizaciones asháninka (CARE, ARPI-SC u
   organizaciones locales), sobre todo para las oraciones de ejemplo.

## 4b. Lo que se decidió

Se importó la **fuente 2** (MINEDU 2021), por la vía institucional del proyecto con el Estado:
169 entradas, 162 con ejemplo de uso, todas con `sourceId` y atribución visible. Se excluyó su
Parte IV. Copia local y motivos en [sources/README.md](./sources/README.md).

De esa obra salió además el **alfabeto oficial** que rige el orden del diccionario, así que fue
decisiva por dos razones, no solo por el vocabulario.

## 4c. Uro

Investigado por separado y con veredicto negativo: no hay fuente con la que construir un diccionario
uro normalizado hoy. La lengua no tiene hablantes desde los años 1920 y no tiene alfabeto oficial.
Detalle y qué lo desbloquearía en [uro-language-sources.md](./uro-language-sources.md).

## 5. Camino recomendado para ampliar

Ordenado por relación entre esfuerzo y riesgo:

1. **Pedir permiso a MINEDU** apoyándose en la relación con el Ministerio de Cultura. Es la fuente
   con más contenido y la más fácil de conseguir limpia.
2. Mientras llega la respuesta, **compilar los pares palabra→traducción** cruzando varias fuentes y
   citando cada una en `sourceId`. Terreno firme y ya soportado por el esquema.
3. **Dejar las oraciones de ejemplo para el final**, con permiso explícito o recogidas con hablantes.
   Son la parte con riesgo real y también la más valiosa.
4. **No copiar la lista completa de ninguna obra.** Ni siquiera con atribución.

---

## 6. Lo que este proyecto ya decidió y no se negocia

Del spec §13: **nunca inventar palabras, traducciones u oraciones de ejemplo.** Si falta contenido se
deja el hueco y se dice. Un dato falso en una lengua originaria es peor que la ausencia de dato.

Por eso la semilla actual son entradas de andamiaje marcadas con `sourceId: "placeholder"`, y
`pnpm dictionary:check` **falla mientras quede una sola**. Ese es el candado que impide que el
andamiaje llegue a producción.
