/**
 * Registro de fuentes.
 *
 * mode:
 *   'fetch'   -> HTTP plano + strip de tags. Barato y rapido.
 *   'browser' -> Playwright/Chromium. Necesario para SPAs (casi todos los bancos y supers).
 *
 * waitFor: selector CSS que confirma que el contenido real ya se hidrato.
 *          Si no aparece en el timeout, igual se captura lo que haya y se marca `thin`.
 *
 * scope:   selector opcional del que se extrae el texto. Recorta nav/footer y baja
 *          mucho el ruido que le mandamos al modelo.
 *
 * insecure: saltear validacion de certificado (algunos sitios de bancos tienen el CN mal).
 */

export const SOURCES = [
  // ══════════════════════════════════════════════════════════
  // Agregadores — mayor cobertura por fuente
  // ══════════════════════════════════════════════════════════
  {
    id: 'promoarg',
    label: 'PromoArg',
    kind: 'agregador',
    mode: 'browser',
    url: 'https://www.promoarg.com/promociones',
    waitFor: 'main',
    scroll: true,
    settle: 6000,
  },
  {
    id: 'promociones-super',
    label: 'Promociones.com.ar — Supermercados',
    kind: 'agregador',
    mode: 'fetch',
    url: 'https://www.promociones.com.ar/categoria/supermercados/',
  },

  // ══════════════════════════════════════════════════════════
  // Supermercados — cadenas nacionales y de AMBA
  // ══════════════════════════════════════════════════════════
  {
    id: 'carrefour',
    label: 'Carrefour',
    kind: 'super',
    comercio: 'Carrefour',
    mode: 'browser',
    url: 'https://www.carrefour.com.ar/promociones-bancarias',
    waitFor: 'body',
    scroll: true,
  },
  {
    id: 'coto',
    label: 'Coto',
    kind: 'super',
    comercio: 'Coto',
    mode: 'browser',
    url: 'https://www.coto.com.ar/promociones/',
    waitFor: 'body',
    scroll: true,
  },
  {
    id: 'jumbo',
    label: 'Jumbo',
    kind: 'super',
    comercio: 'Jumbo',
    mode: 'browser',
    url: 'https://www.jumbo.com.ar/promociones-bancarias',
    waitFor: 'body',
    scroll: true,
  },
  {
    id: 'disco',
    label: 'Disco',
    kind: 'super',
    comercio: 'Disco',
    mode: 'browser',
    url: 'https://www.disco.com.ar/promociones-bancarias',
    waitFor: 'body',
    scroll: true,
  },
  {
    id: 'vea',
    label: 'Vea',
    kind: 'super',
    comercio: 'Vea',
    mode: 'browser',
    url: 'https://www.vea.com.ar/promociones-bancarias',
    waitFor: 'body',
    scroll: true,
  },
  {
    id: 'dia',
    label: 'Supermercados DIA',
    kind: 'super',
    comercio: 'DIA',
    mode: 'browser',
    url: 'https://diaonline.supermercadosdia.com.ar/promociones-bancarias',
    waitFor: 'body',
    scroll: true,
  },
  {
    id: 'changomas',
    label: 'ChangoMás',
    kind: 'super',
    comercio: 'ChangoMás',
    mode: 'browser',
    url: 'https://www.masonline.com.ar/promociones-bancarias',
    waitFor: 'body',
    scroll: true,
  },
  {
    id: 'laanonima',
    label: 'La Anónima',
    kind: 'super',
    comercio: 'La Anónima',
    mode: 'browser',
    url: 'https://supermercado.laanonimaonline.com/promociones',
    waitFor: 'body',
    scroll: true,
  },
  {
    id: 'libertad',
    label: 'Hiperlibertad',
    kind: 'super',
    comercio: 'Libertad',
    mode: 'browser',
    url: 'https://www.hiperlibertad.com.ar/',
    waitFor: 'body',
    scroll: true,
  },
  {
    id: 'toledo',
    label: 'Toledo',
    kind: 'super',
    comercio: 'Toledo',
    mode: 'browser',
    url: 'https://www.toledodigital.com.ar/promociones-bancarias',
    waitFor: 'body',
    scroll: true,
  },

  // ══════════════════════════════════════════════════════════
  // Mayoristas — donde suelen estar los mejores topes
  // ══════════════════════════════════════════════════════════
  {
    id: 'diarco',
    label: 'Diarco',
    kind: 'mayorista',
    comercio: 'Diarco',
    mode: 'browser',
    url: 'https://www.diarco.com.ar/promociones/',
    waitFor: 'body',
    scroll: true,
  },
  {
    id: 'maxiconsumo',
    label: 'Maxiconsumo',
    kind: 'mayorista',
    comercio: 'Maxiconsumo',
    mode: 'browser',
    url: 'https://www.maxiconsumo.com/promociones',
    waitFor: 'body',
    scroll: true,
  },
  {
    id: 'makro',
    label: 'Makro',
    kind: 'mayorista',
    comercio: 'Makro',
    mode: 'browser',
    url: 'https://makro.com.ar/beneficios-bancarios/',
    waitFor: 'body',
    scroll: true,
  },
  {
    id: 'vital',
    label: 'Vital',
    kind: 'mayorista',
    comercio: 'Vital',
    mode: 'browser',
    url: 'https://www.vital.com.ar/',
    waitFor: 'body',
    scroll: true,
  },

  // ══════════════════════════════════════════════════════════
  // Bancos y billeteras
  // ══════════════════════════════════════════════════════════
  {
    id: 'bna',
    label: 'Banco Nación — Supermercados y mayoristas',
    kind: 'banco',
    banco: 'Banco Nación',
    mode: 'fetch',
    url: 'https://bna.com.ar/Personas/DescuentosYPromociones/4431/supermercados-y-mayoristas/',
  },
  {
    id: 'cuentadni',
    label: 'Cuenta DNI — Beneficios',
    kind: 'banco',
    banco: 'Cuenta DNI (Banco Provincia)',
    provincias: ['Buenos Aires'],
    mode: 'browser',
    // El host cuentadni.bancoprovincia.com.ar rechaza la conexión desde headless
    // (CN inválido y luego CONNECTION_RESET). El portal principal sí responde.
    url: 'https://www.bancoprovincia.com.ar/Principal/CuentaDNI',
    waitFor: 'body',
    scroll: true,
  },
  {
    id: 'galicia',
    label: 'Galicia — Beneficios',
    kind: 'banco',
    banco: 'Banco Galicia',
    mode: 'browser',
    url: 'https://www.galicia.ar/personas/promociones',
    waitFor: 'body',
    scroll: true,
  },
  {
    id: 'santander',
    label: 'Santander — Beneficios',
    kind: 'banco',
    banco: 'Banco Santander',
    mode: 'browser',
    url: 'https://www.santander.com.ar/personas/beneficios',
    waitFor: 'body',
    scroll: true,
    settle: 5000,
  },
  {
    id: 'macro',
    label: 'Banco Macro — Beneficios',
    kind: 'banco',
    banco: 'Banco Macro',
    mode: 'browser',
    url: 'https://www.macro.com.ar/beneficios',
    waitFor: 'body',
    scroll: true,
  },
  {
    id: 'ciudad',
    label: 'Banco Ciudad — Beneficios',
    kind: 'banco',
    banco: 'Banco Ciudad',
    mode: 'browser',
    url: 'https://www.bancociudad.com.ar/beneficios/',
    waitFor: 'body',
    scroll: true,
  },
  {
    id: 'credicoop',
    label: 'Credicoop — Beneficios',
    kind: 'banco',
    banco: 'Banco Credicoop',
    mode: 'browser',
    url: 'https://www.bancocredicoop.coop/beneficios',
    waitFor: 'body',
    scroll: true,
  },
  {
    id: 'mercadopago',
    label: 'Mercado Pago — Promociones',
    kind: 'billetera',
    banco: 'Mercado Pago',
    mode: 'browser',
    url: 'https://www.mercadopago.com.ar/promociones',
    waitFor: 'body',
    scroll: true,
  },
  {
    id: 'modo',
    label: 'MODO — Promociones',
    kind: 'billetera',
    banco: 'MODO',
    mode: 'browser',
    url: 'https://www.modo.com.ar/promos',
    waitFor: 'body',
    scroll: true,
  },
];

export const byId = (id) => SOURCES.find((s) => s.id === id);
