/**
 * Esquema de una promocion normalizada.
 *
 * Se usa dos veces:
 *  - Como JSON Schema forzado en la Claude API (output_config.format), asi la salida
 *    del modelo esta garantizada estructuralmente y no hay que parsear prosa.
 *  - Como contrato que consume la PWA.
 *
 * Nota sobre `dias`: 0 = domingo ... 6 = sabado (mismo criterio que Date#getDay).
 */

export const PROMO_PROPS = {
  comercio: {
    type: 'string',
    description:
      'Nombre del comercio o cadena donde aplica. Ej: "Carrefour", "Coto", "Jumbo", "DIA". Si aplica a varios sin nombrarlos, usar "Supermercados adheridos".',
  },
  banco: {
    type: 'string',
    description:
      'Banco o billetera que otorga el beneficio, tal como se lo conoce. Ej: "Banco Nación", "Cuenta DNI (Banco Provincia)", "Mercado Pago", "MODO".',
  },
  medios_pago: {
    type: 'array',
    description: 'Medios de pago habilitados para el beneficio.',
    items: {
      type: 'string',
      enum: ['credito', 'debito', 'qr', 'modo', 'billetera', 'prepaga', 'otro'],
    },
  },
  dias: {
    type: 'array',
    description:
      'Dias de la semana en que aplica. 0=domingo, 1=lunes ... 6=sabado. Si aplica todos los dias, listar los siete.',
    items: { type: 'integer', enum: [0, 1, 2, 3, 4, 5, 6] },
  },
  descuento_pct: {
    type: ['integer', 'null'],
    description:
      'Porcentaje de descuento o reintegro. null si la promo no es porcentual (ej: solo cuotas sin interes).',
  },
  tope_monto: {
    type: ['integer', 'null'],
    description:
      'Tope de reintegro en pesos, como numero entero sin puntos ni simbolos. null si no hay tope o no se informa.',
  },
  tope_periodo: {
    type: ['string', 'null'],
    description: 'Periodo sobre el que se calcula el tope.',
    enum: ['diario', 'semanal', 'quincenal', 'mensual', 'por_compra', null],
  },
  cuotas: {
    type: ['integer', 'null'],
    description: 'Cantidad de cuotas sin interes, si la promo las ofrece. null si no aplica.',
  },
  provincias: {
    type: 'array',
    description:
      'Provincias donde aplica. Usar ["*"] si es a nivel nacional o no se aclara ninguna restriccion geografica.',
    items: { type: 'string' },
  },
  canal: {
    type: 'string',
    description: 'Canal donde aplica el beneficio.',
    enum: ['sucursal', 'online', 'ambos'],
  },
  vigencia_desde: {
    type: ['string', 'null'],
    description: 'Fecha de inicio en formato YYYY-MM-DD. null si no se informa.',
  },
  vigencia_hasta: {
    type: ['string', 'null'],
    description: 'Fecha de fin en formato YYYY-MM-DD. null si no se informa.',
  },
  requisitos: {
    type: ['string', 'null'],
    description:
      'Condiciones relevantes en una linea corta y en espanol rioplatense. Ej: "Solo con tope semanal por CUIT", "Exclusivo clientes con cuenta sueldo". null si no hay ninguna destacable.',
  },
  confianza: {
    type: 'string',
    description:
      'Que tan explicita estaba la informacion en el texto fuente. "alta" si todos los campos clave (banco, dia, porcentaje) estaban escritos literalmente; "media" si alguno se dedujo del contexto; "baja" si hubo que inferir mas de uno.',
    enum: ['alta', 'media', 'baja'],
  },
};

/** JSON Schema para forzar la salida del modelo. */
export const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    promos: {
      type: 'array',
      description:
        'Todas las promociones de supermercado encontradas en el texto. Array vacio si no hay ninguna.',
      items: {
        type: 'object',
        properties: PROMO_PROPS,
        required: [
          'comercio',
          'banco',
          'medios_pago',
          'dias',
          'descuento_pct',
          'tope_monto',
          'tope_periodo',
          'cuotas',
          'provincias',
          'canal',
          'vigencia_desde',
          'vigencia_hasta',
          'requisitos',
          'confianza',
        ],
        additionalProperties: false,
      },
    },
  },
  required: ['promos'],
  additionalProperties: false,
};

/** id estable y determinista, para poder deduplicar entre corridas y fuentes. */
export function promoId(p) {
  const slug = (s) =>
    String(s ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  return [
    slug(p.banco),
    slug(p.comercio),
    (p.dias ?? []).join(''),
    p.descuento_pct ?? 'x',
    p.tope_monto ?? 'x',
  ].join('_');
}
