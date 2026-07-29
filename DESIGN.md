---
name: Almanaque
description: Almanaque de pared argentino — qué descuento conviene hoy, con las tarjetas que tenés
colors:
  paper: "#F2F0EA"
  paper-edge: "#DFDCD2"
  ink: "#14161C"
  ink-soft: "#5A5F6B"
  cobalto: "#1B3FA8"
  cobalto-deep: "#132C77"
  rojo: "#D8232A"
  rojo-deep: "#A5161C"
  rojo-tope: "#9B1319"
  verde-sello: "#0F6B4A"
  amarillo-perf: "#E8C33E"
  regla-sobre-cobalto: "rgba(255 255 255 / 0.34)"
  regla-riel: "rgba(255 255 255 / 0.15)"
  sobre-cobalto: "#F2F0EA"
  chrome-activo-bg: "#F2F0EA"
  chrome-activo-fg: "#132C77"
scale:
  t-3xs: "0.5rem"
  t-2xs: "0.5625rem"
  t-xs: "0.625rem"
  t-sm: "0.75rem"
  t-md: "0.8125rem"
  t-base: "0.9375rem"
  t-lg: "1.0625rem"
  t-xl: "1.1875rem"
  t-2xl: "1.5rem"
  t-3xl: "1.75rem"
  t-4xl: "3rem"
  t-dia: "clamp(3.5rem, 19vw, 6rem)"
typography:
  numeral:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(3.5rem, 19vw, 7rem)"
    fontWeight: 900
    lineHeight: 0.78
    letterSpacing: "-0.045em"
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.35rem, 5.5vw, 2rem)"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.02em"
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.16em"
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
rounded:
  none: "0px"
  hole: "999px"
spacing:
  hair: "2px"
  xs: "6px"
  sm: "10px"
  md: "16px"
  lg: "24px"
  xl: "36px"
components:
  hoja:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "16px"
  banda-mes:
    backgroundColor: "{colors.cobalto}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "10px 16px"
  riel-dia:
    backgroundColor: "{colors.cobalto-deep}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    height: "68px"
  riel-dia-activo:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.cobalto-deep}"
  riel-dia-domingo:
    textColor: "{colors.rojo}"
  chip-banco:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "10px 12px"
  chip-banco-activo:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
---

# Almanaque

<!-- Mundo visual: almanaque de pared argentino (kiosco / taller / cocina).
     Impresión a dos tintas sobre papel: cobalto + rojo de calendario.
     Los domingos van en rojo. El número del día es lo más grande de la hoja. -->

## Overview

El producto es un **almanaque de pared**, no una app de fintech. Toda la interfaz
es una hoja de calendario: banda de mes arriba, número de día enorme, cuerpo
impreso, y una banda de aviso abajo — igual que el almanaque que cuelga en una
ferretería o una cocina.

La estructura viene del staging *riel perimetral*: **la semana es el riel** (fijo,
en el borde inferior, en la zona del pulgar) y **el día es el piso** (el centro
no contiene nada permanente, solo las promos de ese día). Cambiar de día es
cambiar de hoja.

Dos reglas del mundo que no se negocian:

1. **Los domingos van en rojo.** Es la convención más reconocible de cualquier
   calendario en castellano y acá además ordena la lectura.
2. **El número manda.** En un almanaque el dato más grande es el día. En este
   almanaque el dato más grande de cada promo es el **tope**, no el porcentaje.

## Colors

Impresión a dos tintas sobre papel, más un verde de sello para estados de
confirmación. Estrategia: **Committed** — el cobalto ocupa las bandas y el riel
(30–45% de la pantalla), no es un acento suelto.

| Token | Uso |
|---|---|
| `paper` `#F2F0EA` | Fondo de toda la hoja. Papel de almanaque: gris-cálido neutro, **no crema**. |
| `paper-edge` `#DFDCD2` | Reglas, perforado, separadores. Nunca para texto. |
| `ink` `#14161C` | Texto principal. Negro de imprenta, no negro puro. |
| `ink-soft` `#5A5F6B` | Metadatos, fecha de verificación, letra chica. |
| `cobalto` `#1B3FA8` | Banda de mes, cabeceras, superficies de chrome. |
| `cobalto-deep` `#132C77` | Riel de días, estados presionados. |
| `rojo` `#D8232A` | **Domingos, día de hoy, y el tope.** Tinta de señal, se gana. |
| `rojo-deep` `#A5161C` | Rojo presionado / bordes sobre rojo. |
| `verde-sello` `#0F6B4A` | Sello de "verificado hoy". Único verde del sistema. |
| `amarillo-perf` `#E8C33E` | Solo la línea de perforado y el gancho. Decorativo, jamás semántico. |

Contraste mínimo 7:1 para todo dato accionable, medido, no estimado. Se lee bajo
tubo fluorescente de supermercado y al sol.

| Par | Ratio | Uso |
|---|---|---|
| `ink` sobre `paper` | 15.9:1 | Texto principal |
| `ink-soft` sobre `paper` | **7.2:1** | Metadatos y letra chica |
| `rojo-tope` sobre `paper` | **7.4:1** | La cifra del tope |
| `rojo` sobre `paper` | 4.4:1 | **Solo marcas**: domingo, hoy, feriado |

Son dos rojos distintos y la diferencia importa. `rojo` es tinta de calendario:
marca días, no carga texto que haya que leer. `rojo-tope` es el rojo de imprenta
para la cifra, que sí es texto y necesita el 7:1.

El nombre del banco va en `ink` pleno, no en `ink-soft`: es el dato con el que
se decide qué tarjeta apoyar en la caja.

Modo oscuro: se invierte a tinta sobre papel oscuro (`#14161C` de fondo,
`#E8E5DD` de texto), conservando cobalto y rojo saturados. No es un tema
alternativo, es el mismo almanaque de noche.

## Typography

**Archivo** (Omnibus-Type, Buenos Aires) en variable, auto-hosteada en
`web/fonts/`. Una fundición argentina para una app argentina; está dibujada para
señalética y prensa, que es exactamente el registro del almanaque.

- `numeral` — el número del día y el tope. Peso 900, ancho comprimido
  (`wdth` 82), tracking negativo fuerte. Es la voz de la hoja.
- `display` — nombre del comercio. Peso 800.
- `label` — versalitas espaciadas para rótulos de imprenta (`BANCO`, `TOPE`,
  `MEDIO DE PAGO`). Siempre en mayúsculas, siempre 0.16em de tracking.
- `body` — descripción y requisitos.

`font-variant-numeric: tabular-nums` obligatorio en **todo** número: las
columnas de importes tienen que alinearse como en una planilla impresa.

Nunca usar cursiva. Un almanaque no tiene cursivas.

**La rampa es cerrada.** Todo `font-size` del proyecto sale de un token
`--t-*` de `scale` — no hay literales sueltos en el CSS. Doce escalones, del
rótulo de imprenta (`t-3xs`) al numeral del día (`t-dia`). Si un elemento nuevo
no encaja en ninguno, el escalón que falta se agrega acá primero y recién
después se usa.

Las dos tintas que sí quedan fuera del papel/cobalto son reglas de 1px sobre
campo cobalto (`regla-sobre-cobalto` en el sello, `regla-riel` entre celdas del
riel): blanco a baja opacidad, porque tienen que leerse sobre el azul en los
dos modos.

Los tokens `sobre-cobalto`, `chrome-activo-bg` y `chrome-activo-fg` **no se
invierten en modo oscuro**. El cobalto es el mismo azul de día y de noche, así
que lo que va encima tiene que quedarse claro; invertirlos deja texto negro
sobre azul.

## Layout

Mobile-first, una sola columna. El ancho máximo del contenido es 560px y la hoja
se centra en pantallas grandes conservando sus bordes de papel.

Estructura vertical fija:

```
┌─ banda de mes ────────── cobalto, sticky arriba
│  JULIO 2026        · sello verificado
├─ perforado ──────────── línea punteada + gancho
│
│  MIÉRCOLES  ← etiqueta
│  29         ← numeral gigante
│
│  [ promos del día, apiladas ]
│
├─ banda de aviso ──────── cobalto, la publicidad del almanaque:
│                          acá va el resumen de ahorro del día
└─ riel de días ────────── cobalto-deep, sticky abajo, 7 celdas
```

El riel mide 68px de alto y cada celda ocupa 1/7 del ancho — objetivo táctil de
48px mínimo incluso en pantallas de 320px. Vive en `env(safe-area-inset-bottom)`.

Todo lo accionable (riel, filtros, links de fuente) está en la mitad inferior.

## Elevation & Depth

**No hay sombras difusas.** El mundo es papel impreso, no material design. La
profundidad se construye con cuatro recursos, todos sin blur:

1. **Reglas** (`1px solid paper-edge`) — separan filas como en una planilla.
2. **Doble filete** (3px + 1px) bajo la banda de mes y bajo la fecha.
3. **El canto del taco** — dos reglas desplazadas al pie de la hoja, que son las
   hojas de abajo del almanaque. **Se ve también en el teléfono**, que es donde
   la app se usa de verdad: dejar la profundidad solo en `min-width: 600px` la
   deja en cero en el target real.
4. **Sombra dura** de la hoja sobre el fondo, solo en pantallas anchas.

El perforado con su gancho es el único elemento puramente material y aparece una
sola vez por pantalla.

## Shapes

**Radio cero en todo.** Botones, chips, tarjetas, campos: esquinas vivas. Es
papel cortado con guillotina.

Las dos únicas curvas del sistema son los **agujeros del troquel** del perforado
(`rounded.hole`), porque son literalmente agujeros.

Los separadores punteados usan `repeating-linear-gradient`, no `border-dashed`,
para controlar el largo y el espacio del guión como una perforación real.

## Components

### `hoja`
Contenedor de un día. Fondo papel, sin radio, sombra dura de 4px. Al cambiar de
día la hoja **se pasa** (translate + fade corto, 180ms), no aparece.

### `banda-mes`
Sticky arriba. **Lleva el mes y el año, no la marca** — en un almanaque arriba va
el mes; el anunciante va abajo. A la derecha, el sello de verificación con la
hora del último scrapeo: si los datos tienen más de 48 horas pasa de
`verde-sello` a `rojo` y dice cuántos días hace. Cierra con doble filete
(3px + 1px), como una cabecera de imprenta.

### `perforado`
Aparece una sola vez por pantalla: línea troquelada, dos ojales y el **gancho**
en `amarillo-perf`, que es el único latón del sistema. La hoja cuelga de algo.

### `fecha`
El numeral ocupa cerca de un tercio del ancho (`t-dia`), como en la hoja de
papel. A la izquierda, nombre del día, distancia en días, y el slot de
**efeméride** — donde el almanaque lleva el santoral, acá va lo que le sirve al
usuario: "último día del mes, mañana se renueva casi todo" o "arranca la semana,
se resetean los topes semanales". Se marca con un filete `amarillo-perf`.

### `pie-marca`
El pie del almanaque, donde en el papel va el anunciante (la ferretería, la
panadería). Acá va la marca del producto.

### `riel-dia`
Siete celdas fijas. Cada una: inicial del día arriba (`label`, 1 letra) y número
de promos disponibles abajo. El domingo va en `rojo`. El día activo invierte a
papel sobre cobalto. El día de hoy lleva un punto rojo aunque no esté activo.

Una celda sin promos disponibles baja a 40% de opacidad — no se oculta, porque
"el martes no tenés nada" también es información.

### `promo`
La unidad de lectura. Orden de arriba a abajo, no negociable:

1. **Comercio** en `display`.
2. **El tope en `numeral` y en `rojo-tope`** — el dato más grande de la tarjeta.
   Si no hay tope dice `SIN TOPE`.
3. Porcentaje en `label`; el banco en `ink` pleno.
4. Requisitos en `body`, una línea.
5. Aviso de vencimiento si quedan 7 días o menos, fuente y fecha de
   verificación al pie, con link.

**Las cuotas sin interés no son un tope.** Van en `cobalto`, nunca en rojo, y
se agrupan bajo su propio rótulo al final de la lista. Un `6×` y un `$15.000`
son datos de naturaleza distinta y no compiten en el mismo ranking.

**El orden es por ahorro real, no por presencia de tope.** Se compara
`min(tope, % × compra de referencia)` con una compra de referencia de $80.000.
Ordenar poniendo "sin tope" siempre primero hacía que un 15% sin límite le
ganara a un 35% topeado en $15.000 — es decir, ponía la promo más débil del día
como titular. La compra de referencia solo sirve para comparar entre promos y
nunca se le muestra al usuario como si fuera su gasto.

Una promo que el usuario **no** puede usar (banco no marcado) no se borra: se
imprime en `ink-soft` sobre papel, sin el rojo del tope, agrupada abajo bajo el
rótulo `NO TENÉS ESTAS`. Ocultarlas del todo le saca al usuario la posibilidad de
descubrir que le conviene sacar una tarjeta.

### `chip-banco`
Cuadrado, sin radio, borde de 2px en `ink`. Marcado = relleno `ink` con texto
papel. Es una casilla de formulario impreso, no un pill.

## Do's and Don'ts

**Do**
- Poner el tope al lado del porcentaje, siempre, sin excepción.
- Usar rojo para domingo, hoy y tope. Nada más.
- Mostrar la fecha de verificación y el link a la fuente en cada promo.
- Alinear todos los importes con `tabular-nums`.
- Dejar visible el día vacío. La ausencia de promos es un dato.
- Escribir en rioplatense con voseo: "tenés", "mirá", "sacá".

**Don't**
- Nada de logos de bancos ni de cadenas: no hay licencia de uso (ver PRODUCT.md).
  Los bancos se nombran con texto, en `label`.
- Nada de esquinas redondeadas, sombras difusas, gradientes ni glassmorphism.
- Nada de porcentajes en círculos de color: ese es exactamente el patrón que
  el mundo del almanaque refuta.
- No usar verde para "bueno" ni rojo para "malo". Acá el rojo es tinta de
  calendario, no semáforo.
- No ocultar promos por filtro. Degradarlas, no desaparecerlas.
- No animar de más: la hoja se pasa, y nada más se mueve.
