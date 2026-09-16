# Fuentes de la página del pueblo Asháninka — investigación y licencias

> Tareas T0.1 y T0.2 · Fecha: 2026-09-16 · Spec: [specs/ashaninka.md](../specs/ashaninka.md) §4
> Estado: **decidido para el texto.** Las imágenes (T5.1) y la cartografía del mapa (T4.1) siguen
> pendientes de verificación y tienen su sección más abajo.

**Esto no es asesoría legal.** Es el registro de lo que dicen las fuentes y de lo que no se pudo
comprobar. Las decisiones las toma una persona.

Aplica el mismo marco que [dictionary-sources.md](./dictionary-sources.md) §1: proyecto público,
gratuito y sin fines comerciales, con la UNMSM y el Ministerio de Cultura como aliados. Las cláusulas
**NC** y **BY** las cumplimos de fábrica; **ND** y «sin licencia declarada» son los bloqueos reales.

---

## 1. Veredictos

- `usable` — se puede reutilizar y adaptar con atribución sin uso comercial.
- `solo-referencia` — se puede enlazar y citar, **no** extraer a la base de datos.
- `requiere-permiso` — sin licencia declarada; hay que pedirla por escrito.
- `requiere-verificacion` — no se pudo comprobar la licencia desde aquí.

---

## 2. Fuentes en uso

Dos, y sólo dos (spec, decisión #11).

| id               | Fuente                                                                   | Institución                    | Licencia declarada            | Veredicto         | Consultado |
| ---------------- | ------------------------------------------------------------------------ | ------------------------------ | ----------------------------- | ----------------- | ---------- |
| `bdpi-ashaninka` | [Pueblo Ashaninka — BDPI](https://bdpi.cultura.gob.pe/pueblos/ashaninka) | Ministerio de Cultura del Perú | Ninguna declarada en la ficha | `solo-referencia` | 2026-09-11 |
| `ethnologue-cni` | [Asháninka (cni) — Ethnologue](https://www.ethnologue.com/language/cni/) | SIL International              | Restrictiva (suscripción)     | `solo-referencia` | 2026-09-11 |

### 2.1 Qué se toma de cada una, y qué no

`solo-referencia` en ambas no impide construir la página, porque **lo que tomamos son hechos, no
expresión**. La distinción es la misma de `dictionary-sources.md` §1:

| Se toma                                                          | No se toma                                |
| ---------------------------------------------------------------- | ----------------------------------------- |
| Cifras del Censo 2017 (118 277, 55 493, 73 567, 675, 405)        | Párrafos literales de la ficha de la BDPI |
| Hechos históricos con fecha (1635, 1646, 1742-1755, 1980-2000)   | La redacción con que la BDPI los cuenta   |
| Nombres de regiones, ríos y cuencas                              | Tablas o mapas de la fuente               |
| Familia lingüística, códigos ISO, número de grafías del alfabeto | El texto de la ficha de Ethnologue        |

**Todo el texto de la página se escribe parafraseado.** El copyright no cubre el hecho de que el
Censo 2017 haya contado 118 277 personas; cubre cómo se redacta la ficha que lo reporta.

### 2.2 La BDPI es obra del Estado peruano

La ficha no declara licencia. Se cita y se enlaza siempre, con fecha de consulta, y se parafrasea.
Vale la pena que alguien del proyecto formalice el permiso por la vía institucional que ya existe con
el Ministerio de Cultura — la misma que se abrió para el diccionario. No bloquea nada hoy.

---

## 3. Ethnologue: no se puede consumir, y por qué

El pedido original pedía «data dinámica» desde `ethnologue.com/language/cni/`. **No se puede**, por
dos motivos independientes:

1. **Técnico.** La URL devuelve **HTTP 403 Forbidden** a cualquier petición de servidor. Comprobado el
   2026-09-11. No es un fallo transitorio ni un problema de cabeceras: el sitio bloquea el acceso
   automatizado.
2. **Legal.** El contenido de Ethnologue está bajo suscripción y su licencia no permite reproducirlo
   ni extraerlo.

### Lo que se decidió (spec, decisión #2)

El dato vive en `src/data/peoples/ashaninka.json` con su **año** y su **fecha de consulta**, y
Ethnologue se cita y se enlaza como fuente. La página muestra «Datos actualizados al ‹fecha›», que es
lo que el lector necesita para juzgar la antigüedad del dato.

La cifra que aporta Ethnologue —**73 567 hablantes**— es la misma del Censo 2017 que reporta la BDPI,
así que funciona como **corroboración cruzada**, no como dato independiente. Eso está dicho en la
`note` de esa cifra: presentarla como una segunda fuente independiente sería inflar la evidencia.

Si mañana Ethnologue publica una API abierta, el cambio es reemplazar el origen del JSON, no
rediseñar la página.

---

## 4. CARE: retirada como fuente

> **Fecha de la decisión: 2026-09-14. Decidido por: el equipo del proyecto.**

[CARE — Central Asháninka del Río Ene](https://careashaninka.org.pe/) se propuso al inicio del pedido
y **se retiró** antes de escribir contenido. Motivo: las fuentes oficiales del Estado son suficientes
para lo que esta página cuenta.

**Esto está escrito acá a propósito, para que nadie la reintroduzca creyendo que fue un olvido.**

Consecuencias, ya aplicadas al spec:

- Fuera las dos cifras que sólo CARE reportaba: **45 comunidades** de la cuenca del Ene y **235 000
  hectáreas** monitoreadas.
- Efecto secundario bueno: las cinco cifras que quedan salen **del mismo censo y de la misma fuente**,
  así que la página no mezcla años ni metodologías.
- Fuera el término _Kametsa Asaike_, que venía de su agenda política.
- Fuera la foto «Mesa Directiva de CARE» de las candidatas de la galería.

`AC-M1-13` del spec verifica que ninguna cifra ni fuente del JSON provenga de CARE.

---

## 5. La capa que no es legal

Se trata de conocimiento y de la representación de un pueblo indígena. El permiso de una institución
del Estado no es lo mismo que el consentimiento de la comunidad sobre **cómo se la representa**.

**No bloquea la publicación** (spec, decisión #11). La página se construye con las fuentes oficiales
citadas, y lo que llegue de las organizaciones asháninka se incorpora como corrección. Queda anotado
como pendiente del proyecto, no del código: alguien del equipo tiene que llevarlo.

Esto es coherente con lo que ya se registró para el diccionario, donde el mismo pendiente existe para
las oraciones de ejemplo y las grabaciones.

---

## 6. Pendiente: cartografía del mapa (T4.1, hito H2)

El SVG de las seis regiones necesita contornos de los departamentos del Perú con licencia libre.
**Sin verificar todavía.** Candidatas, por orden de limpieza legal:

| Candidata                                                  | Licencia esperada          | A comprobar                                           |
| ---------------------------------------------------------- | -------------------------- | ----------------------------------------------------- |
| [Natural Earth](https://www.naturalearthdata.com/) admin-1 | Dominio público            | La opción más limpia; requiere convertir a SVG.       |
| Mapas SVG de divisiones del Perú en Wikimedia Commons      | CC BY-SA / dominio público | Autor y licencia en la página del archivo, uno a uno. |
| Shapefiles del INEI / datos abiertos del Estado            | Datos abiertos             | Confirmar términos de uso; requiere conversión.       |

**Si ninguna califica, el mapa no se hace** y el territorio queda en texto. Está previsto en el spec
§4.3; no es una regresión.

---

## 7. Pendiente: imágenes (T5.1 y T5.3, hito H3)

**Sin verificar todavía.** Regla de aceptación: sólo entra un archivo cuya página declare **CC BY,
CC BY-SA, CC0 o dominio público**, con autor identificable. Si la licencia no se puede confirmar, la
foto no entra.

### 7.1 Candidatas de Wikimedia Commons (T5.1)

| Archivo                                                              | Por qué                                                  | Licencia |
| -------------------------------------------------------------------- | -------------------------------------------------------- | -------- |
| `Asháninka Dance.jpg`                                                | Vida cultural contemporánea.                             | por ver  |
| `Young Ashaninka girl in an Apiwtxa village, Acre state, Brazil.jpg` | El pueblo también vive en Brasil.                        | por ver  |
| `An Asháninka man, photographed by Charles Kroehle.jpg`              | Histórica (s. XIX). Probable dominio público.            | por ver  |
| `An Asháninka settlement along the Palcazu River, circa 1888.png`    | Histórica, territorio.                                   | por ver  |
| `Alphabet in Ashaninca.jpg`                                          | Puente hacia el diccionario y el alfabeto de 19 grafías. | por ver  |

### 7.2 Las cuatro imágenes que ya están en `public/` (T5.3)

Se usan hoy en el home **sin procedencia documentada**. Hay que rastrearlas:

| Archivo                      | Uso actual              | Procedencia  | Licencia |
| ---------------------------- | ----------------------- | ------------ | -------- |
| `ash.jpg`                    | Fondo del hero del home | por rastrear | por ver  |
| `ashb.jpg`                   | —                       | por rastrear | por ver  |
| `ashaninka-c.webp`           | —                       | por rastrear | por ver  |
| `ashaninka-Mother-Baby.webp` | —                       | por rastrear | por ver  |

Si su procedencia no se confirma, **no entran a la galería** y quedan registradas como deuda del
home. Este trabajo **no** las quita de `hero.tsx`: es un cambio aparte, con su propia decisión.

---

## 8. Lo que no se negocia

Del spec §11 «Nunca»:

- **Ningún párrafo ni cifra sin fuente.** `pnpm peoples:check` lo bloquea desde T2.4.
- **No se inventa un dato**, ni se redondea una cifra sin marcarlo.
- **No se copian párrafos literales** de la BDPI.
- **No se hace scraping de Ethnologue.**
- **No se reintroduce CARE** ni ninguna fuente fuera de §2 sin decidirlo antes.
