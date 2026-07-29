# Almanaque del Ahorro

Qué descuento de supermercado conviene hoy en AMBA, con las tarjetas que tenés.

PWA mobile-first alimentada por un pipeline propio de scraping + normalización
con Claude sobre ~25 fuentes (bancos, billeteras, cadenas de súper y mayoristas).

---

## Por qué existe el pipeline

Las promos ya son públicas, pero están inutilizables en el momento que importan:
repartidas en veinte sitios, escritas en prosa legal en mayúsculas y renovadas
el día 1 de cada mes.

```
VÁLIDO TODOS LOS JUEVES DE JULIO 2026 PARA LAS COMPRAS ONLINE EN
CARREFOUR.COM.AR (...) EL DESCUENTO SE HARÁ EFECTIVO EN EL ACTO, CON TOPE
DE DESCUENTO DE $10.000 POR SEMANA, EXCLUSIVO SOLO PARA CONSUMO FAMILIAR.
QUEDAN EXCLUIDOS DEL DESCUENTO ELECTRODOMÉSTICOS Y TECNOLOGÍA; CARNICERÍA...
```

Ningún selector CSS saca `{ dias: [4], descuento_pct: 20, tope_monto: 10000,
tope_periodo: "semanal" }` de ahí, y si lo sacara se rompería en la próxima
renovación. Por eso la etapa 2 es un modelo con **JSON Schema forzado**.

## Arquitectura

```
scrape ──▶ data/raw/*.txt ──▶ normalize ──▶ data/normalized/*.json ──┐
 Playwright   texto plano       Claude API      promos estructuradas  │
 (SPAs)                       schema forzado                          │
                                                                      ▼
                              data/seed.json ────────────────────▶ build
                              data/overrides.json ────────────────▶  │
                               (correcciones a mano, mandan)          │
                                                                      ▼
                                                            web/promos.json
                                                                      │
                                                                      ▼
                                                          PWA (sin backend)
```

La PWA **nunca scrapea**: lee un JSON estático, lo cachea con service worker y
funciona sin señal — que es justo cuando la vas a usar, adentro del súper.

## Uso

```bash
npm install                 # incluye la descarga de Chromium

npm run scrape              # baja las 25 fuentes a data/raw/
npm run scrape bna carrefour  # o solo algunas

npm run normalize           # convierte el texto crudo en promos (necesita API key)
npm run build               # publica web/promos.json
npm run pipeline            # las tres seguidas

npm run serve               # http://localhost:5178
node scripts/shot.mjs       # capturas a .shots/ para revisar el diseño
node scripts/icons.mjs      # regenera los PNG del ícono desde icon.svg
```

Para la etapa de normalización:

```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
```

Variables opcionales: `PROMOS_MODEL` (default `claude-opus-5`) y `PROMOS_EFFORT`
(default `medium`). Bajar el effort abarata la corrida; bajar el modelo también,
a costa de precisión en los topes, que es justo el dato más difícil de extraer.

## Estado de las fuentes

23 de 25 devuelven contenido útil. Verificado el 2026-07-29:

| Estado | Fuentes |
|---|---|
| ✅ Andan | PromoArg, Promociones.com.ar, Carrefour, Coto, Jumbo, Disco, Vea, DIA, ChangoMás, La Anónima, Libertad, Toledo, Diarco, Maxiconsumo, Makro, Vital, BNA, Galicia, Macro, Ciudad, Credicoop, Mercado Pago, MODO |
| ⚠️ Santander | El sitio tarda más de 60s en responder desde headless. Hay que subir el timeout o entrar por otra URL. |
| ⚠️ Cuenta DNI | El host `cuentadni.bancoprovincia.com.ar` corta la conexión desde headless (cert con CN inválido, después `CONNECTION_RESET`). El portal principal responde pero no expone los beneficios sin su propio JS. |

Casi todas necesitan Playwright: con `fetch` plano solo se saca contenido de BNA
y Promociones.com.ar. El resto son SPAs que devuelven un shell vacío.

## Corregir datos a mano

Lo que extrae el modelo se puede pisar sin tocar código, desde
`data/overrides.json`:

```json
{
  "reemplazar": [
    { "id": "banco-nacion_supermercados-adheridos_3_30_x", "tope_monto": 12000 }
  ],
  "ocultar": ["mi-carrefour_carrefour_123_10_35000"]
}
```

Los `id` salen de `web/promos.json` o de la salida de `npm run build`.
`data/seed.json` es la base verificada a mano que se usa mientras el pipeline
no corrió todavía.

## Automatización

`.github/workflows/actualizar.yml` corre a las 06:00 y 18:00 (hora de Argentina),
publica `web/promos.json` y lo comitea si cambió. Si salen menos de 5 promos
aborta sin comitear, para que un scrapeo roto no vacíe la app.

Requiere el secret `ANTHROPIC_API_KEY` en el repo.

## Diseño

El mundo visual está documentado en [`DESIGN.md`](DESIGN.md) y el producto en
[`PRODUCT.md`](PRODUCT.md). En corto: **es un almanaque de pared argentino**,
impreso a dos tintas — cobalto y rojo de calendario — sobre papel. Los domingos
van en rojo, el radio es cero en todo, y el número más grande de cada promo es
el **tope**, no el porcentaje: un 30% con tope de $12.000 es una compra de
$40.000 y nada más.

Tipografía: [Archivo](https://github.com/Omnibus-Type/Archivo) variable, de
Omnibus-Type (Buenos Aires), auto-hosteada en `web/fonts/`.

## Límites conocidos

- **Alcance AMBA.** No hay filtro de provincia: Cuenta DNI se muestra siempre y
  las promos exclusivas de otras provincias no entran.
- **Los datos pueden estar viejos o mal.** Vienen de scraping. Cada promo muestra
  su fuente y su fecha de verificación, y las de baja confianza avisan.
- **Sin logos** de bancos ni de cadenas: no hay licencia de uso. Se nombran con
  texto.

## Legal

Se leen páginas públicas y se normalizan **datos fácticos** (que el miércoles
hay 30% con tal banco no tiene copyright). No se republica texto de las fuentes,
y cada promo linkea a su origen. Respetá `robots.txt` y el rate limit si agregás
fuentes.

---

Fran4All
