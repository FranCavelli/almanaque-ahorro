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
- El TOPE es el dato más importante después del porcentaje. Buscalo con cuidado: suele estar en la letra chica en mayúsculas ("CON TOPE DE DESCUENTO DE $10.000 POR SEMANA"). Si el texto dice "sin tope", usá null en tope_monto y null en tope_periodo.
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

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Falta ANTHROPIC_API_KEY en el entorno.');
    console.error('  PowerShell:  $env:ANTHROPIC_API_KEY = "sk-ant-..."');
    process.exit(1);
  }

  const only = process.argv.slice(2);
  const index = JSON.parse(await readFile(join(RAW_DIR, '_index.json'), 'utf8'));
  const usable = index.fuentes.filter((f) => f.ok && (!only.length || only.includes(f.id)));

  if (!usable.length) {
    console.error('No hay fuentes con contenido útil. Corré primero: npm run scrape');
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });
  console.log(`Normalizando ${usable.length} fuente(s) con ${MODEL} (effort: ${EFFORT})\n`);

  const all = [];
  const totals = { in: 0, out: 0, cacheRead: 0, cacheWrite: 0 };

  for (const f of usable) {
    const source = SOURCES.find((s) => s.id === f.id);
    const text = await readFile(join(RAW_DIR, `${f.id}.txt`), 'utf8');

    try {
      const { promos, usage } = await normalizeOne(source, text);

      totals.in += usage.input_tokens ?? 0;
      totals.out += usage.output_tokens ?? 0;
      totals.cacheRead += usage.cache_read_input_tokens ?? 0;
      totals.cacheWrite += usage.cache_creation_input_tokens ?? 0;

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

  console.log(`\n${all.length} promos extraídas -> data/normalized/`);
  console.log(
    `Tokens: ${totals.in} in / ${totals.out} out ` +
      `(cache: ${totals.cacheRead} leídos, ${totals.cacheWrite} escritos)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
