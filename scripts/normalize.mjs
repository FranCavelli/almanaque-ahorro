/**
 * Etapa 2 — Normalizacion con Claude.
 *
 * Toma cada data/raw/<id>.txt y lo convierte en promociones estructuradas.
 * La salida esta forzada por JSON Schema (output_config.format), asi que no
 * hay que parsear prosa ni defenderse de markdown alrededor del JSON: si el
 * modelo responde, responde con la forma correcta.
 *
 * Por que un LLM y no selectores CSS: las promos estan escritas en prosa
 * ("VALIDO TODOS LOS JUEVES DE JULIO 2026 ... CON TOPE DE DESCUENTO DE $10.000
 * POR SEMANA"), cambian de maquetado todos los meses y cada cadena las redacta
 * distinto. Un selector se rompe en la primera renovacion; esto no.
 *
 * Uso:
 *   node scripts/normalize.mjs              # todas las fuentes con contenido
 *   node scripts/normalize.mjs carrefour    # solo una
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCES } from '../src/sources.mjs';
import { EXTRACTION_SCHEMA, promoId } from '../src/schema.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW_DIR = join(ROOT, 'data', 'raw');
const OUT_DIR = join(ROOT, 'data', 'normalized');

const MODEL = process.env.PROMOS_MODEL ?? 'claude-opus-5';
const EFFORT = process.env.PROMOS_EFFORT ?? 'medium';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const SYSTEM = `Sos un extractor de promociones bancarias de supermercados en Argentina.

Recibís el texto crudo de una página web (banco, billetera, supermercado o agregador) y tenés que devolver únicamente las promociones que sirven para comprar en SUPERMERCADOS, HIPERMERCADOS o MAYORISTAS de alimentos.

REGLAS DE INCLUSIÓN
- Incluí: descuentos y reintegros porcentuales, y cuotas sin interés, cuando apliquen a supermercados/mayoristas.
- Excluí: promos de indumentaria, gastronomía, combustible, turismo, electro, cine, farmacia y cualquier rubro que no sea supermercado.
- Excluí: ofertas de productos puntuales ("2x1 en gaseosas", "20% en la marca X"). Solo nos interesan beneficios ligados a un MEDIO DE PAGO.
- Excluí: promos claramente vencidas si el texto trae una fecha de fin ya pasada.
- Si la página no tiene ninguna promo de supermercado, devolvé un array vacío. No inventes nada.

CÓMO COMPLETAR LOS CAMPOS
- El TOPE es el dato más importante después del porcentaje. Buscalo con cuidado: suele estar en la letra chica en mayúsculas ("CON TOPE DE DESCUENTO DE $10.000 POR SEMANA").
- Distinguí con cuidado estos tres casos, porque la app los muestra distinto y confundirlos le miente al usuario:
  1. El texto dice un monto -> tope_monto con el número, sin_tope_explicito en false.
  2. El texto dice literalmente que no hay tope ("sin tope", "¡Sin Tope!", "sin límite de reintegro") -> tope_monto en null, sin_tope_explicito en TRUE.
  3. El texto no menciona ningún tope, ni monto ni ausencia -> tope_monto en null, sin_tope_explicito en FALSE. Esto pasa mucho en páginas de listado, donde cada tarjeta solo dice "25% de descuento" y el tope está en el detalle que no tenemos. Ante la mínima duda, este caso.
- tope_monto va como entero sin puntos ni símbolos: "$12.000" -> 12000.
- Traducí los días a números: domingo=0, lunes=1, martes=2, miércoles=3, jueves=4, viernes=5, sábado=6. "Todos los jueves" -> [4]. "Lunes y miércoles" -> [1,3]. "De lunes a miércoles" -> [1,2,3]. "Todos los días" -> [0,1,2,3,4,5,6].
- banco: usá el nombre con el que la gente lo conoce ("Banco Nación", no "BNA S.A."). Si el beneficio lo da la tarjeta propia de la cadena, poné ese nombre ("Carrefour Banco", "Tarjeta Cencosud").
- provincias: ["*"] salvo que el texto restrinja explícitamente la zona.
- Si un mismo beneficio aplica a varios días con el mismo porcentaje y tope, es UNA sola promo con varios días. Si el porcentaje o el tope cambian según el día, son promos separadas.
- requisitos: una línea corta, en español rioplatense, solo si hay una condición que le cambia la decisión al usuario (ej: "Solo comprando online", "Exclusivo mayores de 60 o beneficiarios ANSES"). No copies la letra chica entera.
- confianza: "alta" solo si banco, días y porcentaje estaban escritos literalmente.

No expliques nada. Devolvé solo la estructura pedida.`;

const client = new Anthropic(); // toma ANTHROPIC_API_KEY del entorno

function userPrompt(source, text) {
  const pistas = [
    source.comercio ? `El comercio de esta página es: ${source.comercio}.` : null,
    source.banco ? `El emisor de esta página es: ${source.banco}.` : null,
    source.provincias
      ? `Este beneficio está limitado a: ${source.provincias.join(', ')}.`
      : null,
    source.kind === 'agregador'
      ? 'Es un agregador: cada promo puede ser de un banco y un comercio distintos, no asumas uno solo.'
      : null,
  ].filter(Boolean);

  return `Fuente: ${source.label}
URL: ${source.url}
Fecha de hoy: ${new Date().toISOString().slice(0, 10)}
${pistas.length ? '\n' + pistas.join('\n') : ''}

--- TEXTO DE LA PÁGINA ---
${text}
--- FIN DEL TEXTO ---`;
}

/**
 * Corta el texto en tandas cuando es muy largo, respetando los saltos de linea.
 * Antes se truncaba en la etapa de scraping y las promos del final se perdian
 * sin que nadie se enterara. Preferimos pagar dos llamadas antes que mentir
 * por omision.
 */
const CHARS_POR_TANDA = 40000;

function enTandas(text) {
  if (text.length <= CHARS_POR_TANDA) return [text];

  const tandas = [];
  const lineas = text.split('\n');
  let actual = [];
  let largo = 0;

  for (const l of lineas) {
    if (largo + l.length > CHARS_POR_TANDA && actual.length) {
      tandas.push(actual.join('\n'));
      actual = [];
      largo = 0;
    }
    actual.push(l);
    largo += l.length + 1;
  }
  if (actual.length) tandas.push(actual.join('\n'));
  return tandas;
}

async function normalizeOne(source, text) {
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    output_config: {
      effort: EFFORT,
      format: { type: 'json_schema', schema: EXTRACTION_SCHEMA },
    },
    // El system prompt es idéntico para todas las fuentes: cachearlo hace que
    // a partir de la segunda llamada se pague ~10% por esa parte del prompt.
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userPrompt(source, text) }],
  });

  const msg = await stream.finalMessage();

  if (msg.stop_reason === 'refusal') {
    throw new Error(`El modelo rechazó la request (${msg.stop_details?.category ?? 'sin categoría'})`);
  }
  if (msg.stop_reason === 'max_tokens') {
    throw new Error('Respuesta truncada por max_tokens — subir el límite o partir el input');
  }

  const block = msg.content.find((b) => b.type === 'text');
  if (!block) throw new Error('La respuesta no trajo bloque de texto');

  const { promos } = JSON.parse(block.text);
  return { promos, usage: msg.usage };
}

const HUELLAS = join(OUT_DIR, '_huellas.json');
const huella = (t) => createHash('sha256').update(t).digest('hex').slice(0, 16);

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Falta ANTHROPIC_API_KEY en el entorno.');
    console.error('  PowerShell:  $env:ANTHROPIC_API_KEY = "sk-ant-..."');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const forzar = args.includes('--todo');
  const only = args.filter((a) => !a.startsWith('--'));

  const index = JSON.parse(await readFile(join(RAW_DIR, '_index.json'), 'utf8'));
  const usable = index.fuentes.filter((f) => f.ok && (!only.length || only.includes(f.id)));

  if (!usable.length) {
    console.error('No hay fuentes con contenido útil. Corré primero: npm run scrape');
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });

  /**
   * Las promos se renuevan una vez por mes. Volver a mandarle al modelo un
   * texto idéntico al de ayer es gasto puro, así que guardamos la huella de
   * cada archivo crudo y solo pagamos por lo que efectivamente cambió.
   * `--todo` ignora las huellas y re-normaliza entero.
   */
  const previas = existsSync(HUELLAS)
    ? JSON.parse(await readFile(HUELLAS, 'utf8'))
    : {};
  const nuevas = { ...previas };

  console.log(`Normalizando con ${MODEL} (effort: ${EFFORT})\n`);

  const all = [];
  const totals = { in: 0, out: 0, cacheRead: 0, cacheWrite: 0 };
  let saltadas = 0;

  for (const f of usable) {
    const source = SOURCES.find((s) => s.id === f.id);
    const text = await readFile(join(RAW_DIR, `${f.id}.txt`), 'utf8');
    const h = huella(text);
    const cacheado = join(OUT_DIR, `${f.id}.json`);

    if (!forzar && previas[f.id] === h && existsSync(cacheado)) {
      const previo = JSON.parse(await readFile(cacheado, 'utf8'));
      all.push(...previo);
      saltadas++;
      console.log(`  =  ${f.id.padEnd(20)} sin cambios (${previo.length} promos)`);
      continue;
    }

    try {
      const tandas = enTandas(text);
      const promos = [];

      for (const [i, tanda] of tandas.entries()) {
        const r = await normalizeOne(source, tanda);
        promos.push(...r.promos);
        totals.in += r.usage.input_tokens ?? 0;
        totals.out += r.usage.output_tokens ?? 0;
        totals.cacheRead += r.usage.cache_read_input_tokens ?? 0;
        totals.cacheWrite += r.usage.cache_creation_input_tokens ?? 0;
        if (tandas.length > 1) {
          console.log(`     tanda ${i + 1}/${tandas.length}: ${r.promos.length} promos`);
        }
      }

      const enriched = promos.map((p) => ({
        ...p,
        id: promoId(p),
        fuente_id: f.id,
        fuente_label: source.label,
        url_fuente: source.url,
        verificado_at: new Date().toISOString(),
      }));

      await writeFile(
        join(OUT_DIR, `${f.id}.json`),
        JSON.stringify(enriched, null, 2),
        'utf8',
      );
      all.push(...enriched);
      nuevas[f.id] = h; // solo se registra si la corrida salió bien

      const dias = [...new Set(enriched.flatMap((p) => p.dias))].sort();
      console.log(
        `OK   ${f.id.padEnd(20)} ${String(enriched.length).padStart(3)} promos  ` +
          `[${dias.map((d) => DIAS[d].slice(0, 3)).join(' ')}]`,
      );
    } catch (err) {
      console.log(`ERR  ${f.id.padEnd(20)} ${err.message}`);
    }
  }

  await writeFile(join(OUT_DIR, '_all.json'), JSON.stringify(all, null, 2), 'utf8');
  await writeFile(HUELLAS, JSON.stringify(nuevas, null, 2), 'utf8');

  const consultadas = usable.length - saltadas;
  console.log(`\n${all.length} promos -> data/normalized/`);
  console.log(`Fuentes: ${consultadas} consultadas al modelo, ${saltadas} sin cambios`);
  console.log(
    `Tokens: ${totals.in} in / ${totals.out} out ` +
      `(cache: ${totals.cacheRead} leídos, ${totals.cacheWrite} escritos)`,
  );

  // Precios de claude-opus-5 por millón de tokens: $5 in, $25 out, $0.50 cache read.
  const sinCache = Math.max(0, totals.in - totals.cacheRead);
  const usd = (sinCache * 5 + totals.cacheRead * 0.5 + totals.out * 25) / 1e6;
  console.log(`Costo aproximado de esta corrida: USD ${usd.toFixed(3)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
