# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Personas que hacen las compras del super en AMBA (CABA y Gran Buenos Aires) y tienen varias tarjetas o billeteras virtuales. El momento de uso real es de pie, con una mano, mirando el teléfono: o bien decidiendo **cuándo** ir al súper esta semana, o bien ya adentro del local, en la fila de la caja, decidiendo **con qué medio de pago** apoyar la tarjeta.

No son usuarios que quieran investigar. Quieren una respuesta en menos de cinco segundos y volver a lo suyo.

Sin cuentas ni login: cualquiera abre la app y la usa. Las preferencias viven en el dispositivo.

## Product Purpose

Responder una sola pregunta bien: **¿qué conviene hoy, con lo que yo tengo en la billetera?**

Existe porque la información ya está pública pero es inutilizable en el momento que importa: repartida entre veinte sitios, escrita en prosa legal en mayúsculas, y renovada el día 1 de cada mes. La app cobra sentido si reemplaza el ritual de buscar en Google "descuentos supermercados [mes]" y leer una nota periodística.

Éxito = el usuario abre la app en la puerta del súper y decide sin leer nada largo.

## Positioning

Dos cosas que un agregador genérico no hace:

1. **Filtra por lo que el usuario realmente tiene.** No es un catálogo de todas las promos del país: es la lista corta de las que puede usar hoy con sus propias tarjetas.
2. **Trata el tope como el dato principal, no como letra chica.** Un 30% con tope de $12.000 semanal es una compra de $40.000 y nada más. La app muestra el techo real de ahorro, no solo el porcentaje que grita el banner.

## Operating Context

- Se usa parado, con una mano, en un pasillo o en la caja. A veces sin señal dentro del local.
- El dato se renueva casi entero el día 1 de cada mes, y algunas promos son por semana.
- La decisión suele ser binaria y urgente: *¿pago con esta o con esta otra?*
- Los datos vienen de un pipeline propio (scraping + normalización con LLM) que corre 2 veces por día y publica un JSON estático.

## Capabilities and Constraints

**Confirmado:**
- Vista por día de la semana, con "hoy" como estado inicial.
- El usuario marca qué bancos y billeteras tiene; el resto se oculta o se degrada.
- Funciona offline: el JSON de promos se cachea con service worker.
- Alcance geográfico AMBA. **No hay filtro de provincia**: Cuenta DNI se muestra siempre, y las promos exclusivas de otras provincias no entran.
- Sin backend, sin cuentas, sin analytics. Preferencias en `localStorage`.

**Terminología del dominio (usar la del usuario, no la del banco):**
- *tope* — el máximo de reintegro. Nunca decirle "límite de devolución".
- *reintegro* vs *descuento en el acto* — son distintos y al usuario le importa la diferencia.
- *billetera* — MODO, Mercado Pago, Cuenta DNI, Personal Pay.
- *cuotas sin interés* — beneficio de otra naturaleza que un %; no mezclarlos en el mismo ranking.

**Restricciones técnicas:**
- Sin dependencias externas en runtime: HTML/CSS/JS vanilla, un solo `promos.json`.
- Debe cargar y ser usable en 3G y en teléfonos de gama media.

## Brand Commitments

Autor: **Fran4All**. Sin rastros de generación por IA en el código ni en la interfaz.

Español rioplatense en toda la UI (voseo). Nombre del producto: **sin definir** — se resuelve junto al mundo visual.

## Evidence on Hand

- Pipeline funcionando sobre ~25 fuentes reales (bancos, billeteras, cadenas de súper y mayoristas, agregadores). 16+ devuelven contenido útil.
- Datos reales ya capturados de Carrefour, Coto, Jumbo, Disco, Vea, DIA, ChangoMás, La Anónima, Toledo, BNA, Macro, Ciudad, Credicoop, Mercado Pago y PromoArg.
- **No hay** logos oficiales de bancos ni de cadenas con licencia de uso. La identidad visual no puede depender de marcas de terceros.
- **No hay** usuarios reales, testimonios, ni métricas de uso. No inventar ninguno.

## Product Principles

1. **El tope manda.** Cualquier vista que muestre un porcentaje sin su tope al lado está mintiendo por omisión.
2. **Menos promos, mejores.** El valor está en descartar, no en listar. Una pantalla con las 3 que le sirven vale más que una con las 40 que existen.
3. **Decir cuándo se verificó.** Los datos vienen de scraping y pueden estar viejos o mal. Siempre visible la fecha de verificación y el link a la fuente original.
4. **Se usa con una mano.** Todo lo accionable vive en la mitad inferior de la pantalla.
5. **Offline es el caso normal, no el borde.** Dentro del súper no hay señal.

## Accessibility & Inclusion

Se usa bajo luz de supermercado (fluorescente, alto brillo) y a veces al sol en la calle. Contraste alto obligatorio, no decorativo. Objetivos táctiles de 44px mínimos: se opera caminando y apurado.
