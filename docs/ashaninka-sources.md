# Fuentes de la página del pueblo Asháninka — investigación y licencias

> Tareas T0.1 y T0.2 · Fecha: 2026-09-16 · Spec: [specs/ashaninka.md](../specs/ashaninka.md) §4
> Estado: **decidido para el texto y para las imágenes** (imágenes verificadas el 2026-09-23, T5.1 y
> T5.3). La cartografía del mapa (T4.1) sigue pendiente y tiene su sección más abajo.

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

## 7. Imágenes: verificadas archivo por archivo (T5.1 y T5.3, hito H3)

> **Verificado el 2026-09-23.** Método: la API `action=query&prop=imageinfo&iiprop=extmetadata` de
> Wikimedia Commons, que devuelve licencia y autor tal como los declara la página del archivo. No se
> asumió ninguna licencia por parecido ni por el nombre del archivo.

Regla de aceptación: sólo entra un archivo cuya página declare **CC BY, CC BY-SA, CC0 o dominio
público**, con autor identificable. Si la licencia no se puede confirmar, la foto no entra.

### 7.1 Las cinco que entraron a la galería

| Archivo en Commons                                                                                                                                                                                                | Archivo local                               | Licencia        | Autor                                    | Veredicto |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | --------------- | ---------------------------------------- | --------- |
| [Asháninka Dance.jpg](https://commons.wikimedia.org/wiki/File:Ash%C3%A1ninka_Dance.jpg)                                                                                                                           | `ashaninka-dance.jpg`                       | CC BY-SA 2.0    | Carly Rojas                              | `usable`  |
| [Mujeres asháninka y yanesha … Flora Tristán, 2025 01.jpg](https://commons.wikimedia.org/wiki/File:Mujeres_ash%C3%A1ninka_y_yanesha_en_capacitaci%C3%B3n_proyecto_Prende_del_CMP_Flora_Trist%C3%A1n,_2025_01.jpg) | `ashaninka-yanesha-women-training-2025.jpg` | CC BY-SA 4.0    | Centro de la Mujer Peruana Flora Tristán | `usable`  |
| [Alphabet in Ashaninca.jpg](https://commons.wikimedia.org/wiki/File:Alphabet_in_Ashaninca.jpg)                                                                                                                    | `ashaninka-alphabet-school.jpg`             | CC BY-SA 4.0    | Schönitzer                               | `usable`  |
| [An Asháninka man, photographed by Charles Kroehle.jpg](https://commons.wikimedia.org/wiki/File:An_Ash%C3%A1ninka_man,_photographed_by_Charles_Kroehle.jpg)                                                       | `ashaninka-man-kroehle.jpg`                 | Dominio público | Charles Kroehle                          | `usable`  |
| [An Asháninka settlement along the Palcazu River, circa 1888.png](https://commons.wikimedia.org/wiki/File:An_Ash%C3%A1ninka_settlement_along_the_Palcazu_River,_circa_1888.png)                                   | `palcazu-river-settlement-1888.jpg`         | Dominio público | Charles Kroehle                          | `usable`  |

Todas viven en `public/peoples/ashaninka/` (spec §7.1: no se enlaza en caliente). Las tres grandes se
reescalaron a 1600 px de ancho y se recodificaron en JPEG —el PNG del asentamiento pesaba 8,9 MB—;
las dos chicas entraron tal cual. Total en el repo: **680 KB**.

**`ashaninka-dance.jpg` lleva una marca de agua visible** («©Carly Rojas Aguise») quemada en el
píxel por su autor. No es un problema de licencia —está publicada como CC BY-SA 2.0— pero es una
firma que se ve en la página. Si molesta, la salida es reemplazar la foto, no borrarle la marca.

### 7.2 La que se dejó fuera, y por qué

| Archivo                                                                                                                                                                          | Licencia                      | Motivo de la exclusión                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Young Ashaninka girl in an Apiwtxa village, Acre state, Brazil.jpg](https://commons.wikimedia.org/wiki/File:Young_Ashaninka_girl_in_an_Apiwtxa_village,_Acre_state,_Brazil.jpg) | CC BY 2.0 (Pedro França/MinC) | **La licencia alcanza, el resto no.** La página del archivo declara `Restrictions: personality`, el aviso de derechos de imagen de Commons, y la retratada es una niña identificable en primer plano. La licencia cubre el copyright del fotógrafo, no el consentimiento de la persona retratada. |

Es una decisión editorial, no legal, y **es revisable**: si el equipo la quiere dentro, la licencia no
lo impide. Se dejó fuera porque publicar el retrato de una menor identificable en un sitio sobre su
pueblo merece una decisión humana explícita, y porque la galería llega a cinco fotos sin ella.

En su lugar entró la foto del **CMP Flora Tristán**, que no estaba en la lista original del spec:
es contemporánea, está tomada en el Perú —no en Brasil— y muestra a mujeres asháninka y yanesha en un
taller, que es vida cotidiana y no retrato individual.

### 7.3 Las cuatro imágenes que ya estaban en `public/` (T5.3)

**Veredicto: procedencia no determinada, las cuatro.** Ninguna entra a la galería.

| Archivo                      | Tamaño   | Uso actual                                          | Qué se encontró                                                                                                                                       | Veredicto               |
| ---------------------------- | -------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `ash.jpg`                    | 900×600  | Fondo del hero del home (`src/components/hero.tsx`) | Sin EXIF, sin IPTC, sin XMP. Añadida en `53c9baf` (2026-07-20) sin nota de origen.                                                                    | `requiere-verificacion` |
| `ashb.jpg`                   | 1000×667 | **Ninguno**                                         | XMP presente, pero sólo con los espacios de nombres de Adobe: sin `dc:creator`, `dc:rights` ni `photoshop:Credit`. Añadida en `53c9baf` (2026-07-20). | `requiere-verificacion` |
| `ashaninka-c.webp`           | 535×335  | **Ninguno**                                         | EXIF mínimo, sin autor ni copyright. Añadida en `c06f6a3` (2026-07-17).                                                                               | `requiere-verificacion` |
| `ashaninka-Mother-Baby.webp` | 400×312  | **Ninguno**                                         | EXIF mínimo, sin autor ni copyright. Añadida en `c06f6a3` (2026-07-17).                                                                               | `requiere-verificacion` |

Lo único que quedó registrado es quién las subió al repo, y eso no dice de dónde salieron.

Dos consecuencias, y ninguna se resuelve en este trabajo:

1. **`ash.jpg` es deuda del home.** Se publica hoy en el hero sin procedencia. Este trabajo **no** la
   quita de `hero.tsx`: es un cambio aparte, con su propia decisión (spec §7.1).
2. **Las otras tres no las usa nadie.** No aparecen en ningún `.tsx`, `.ts`, `.json` ni `.css` del
   repo. Son archivos muertos con licencia desconocida, así que borrarlas no rompe nada y cierra el
   riesgo — pero borrar es una decisión del equipo, no un efecto colateral de la galería.

---

## 8. Lo que no se negocia

Del spec §11 «Nunca»:

- **Ningún párrafo ni cifra sin fuente.** `pnpm peoples:check` lo bloquea desde T2.4.
- **No se inventa un dato**, ni se redondea una cifra sin marcarlo.
- **No se copian párrafos literales** de la BDPI.
- **No se hace scraping de Ethnologue.**
- **No se reintroduce CARE** ni ninguna fuente fuera de §2 sin decidirlo antes.
