/**
 * Etapa 3 — Build.
 *
 * Junta lo normalizado por el modelo con las correcciones manuales y publica
 * un unico web/promos.json que la PWA consume. Aca no hay red ni modelo: es
 * determinista y se puede correr sin credenciales.
 *
 * Orden de precedencia (de menor a mayor):
 *   1. data/normalized/_all.json   — lo que extrajo el modelo
 *   2. data/seed.json              — promos verificadas a mano (base inicial)
 *   3. data/overrides.json         — correcciones y bajas manuales, mandan siempre
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promoId } from '../src/schema.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const P = (...p) => join(ROOT, ...p);

const HOY = new Date().toISOString().slice(0, 10);

async function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (err) {
    console.warn(`  aviso: ${path} no se pudo parsear (${err.message})`);
    return fallback;
  }
}

/** Una promo esta vigente si no vencio y ya arranco. */
function vigente(p) {
  if (p.vigencia_hasta && p.vigencia_hasta < HOY) return false;
  if (p.vigencia_desde && p.vigencia_desde > HOY) return false;
  return true;
}

/**
 * Cuando dos fuentes traen la misma promo, gana la que tenga mas informacion:
 * primero la que declara tope (el dato que mas cuesta encontrar), despues la
 * de mayor confianza, y a igualdad la mas reciente.
 */
const CONFIANZA = { alta: 3, media: 2, baja: 1 };

function mejor(a, b) {
  const conTope = (p) => (p.tope_monto != null || p.tope_periodo != null ? 1 : 0);
  if (conTope(a) !== conTope(b)) return conTope(a) > conTope(b) ? a : b;

  const ca = CONFIANZA[a.confianza] ?? 0;
  const cb = CONFIANZA[b.confianza] ?? 0;
  if (ca !== cb) return ca > cb ? a : b;

  return (a.verificado_at ?? '') >= (b.verificado_at ?? '') ? a : b;
}

async function main() {
  const normalized = await readJson(P('data', 'normalized', '_all.json'), []);
  const seed = await readJson(P('data', 'seed.json'), []);
  const overrides = await readJson(P('data', 'overrides.json'), { reemplazar: [], ocultar: [] });

  /**
   * El seed es andamio: sirve para que la app tenga datos reales antes de que
   * exista una API key. Apenas el modelo produce algo, manda el modelo — si no,
   * las dos versiones de la misma promo conviven como duplicados, porque el
   * seed suele nombrar peor al emisor ("Visa plan sueldo" vs "Banco Patagonia")
   * y por lo tanto genera otro id.
   */
  const base = normalized.length ? normalized : seed;
  const origen = normalized.length ? 'modelo' : 'seed (el modelo no produjo nada)';
  console.log(`Entradas: ${base.length} desde ${origen}`);

  // --- 1. juntar y deduplicar ---
  const porId = new Map();
  for (const p of base) {
    const id = p.id ?? promoId(p);
    const previo = porId.get(id);
    porId.set(id, previo ? mejor(previo, { ...p, id }) : { ...p, id });
  }
  const dedup = porId.size;

  // --- 2. aplicar correcciones manuales ---
  for (const fix of overrides.reemplazar ?? []) {
    const actual = porId.get(fix.id);
    if (!actual) {
      console.warn(`  aviso: override para id inexistente "${fix.id}"`);
      continue;
    }
    porId.set(fix.id, { ...actual, ...fix, corregido_a_mano: true });
  }
  for (const id of overrides.ocultar ?? []) porId.delete(id);

  // --- 3. filtrar vencidas ---
  const todas = [...porId.values()];
  const vencidas = todas.filter((p) => !vigente(p));
  const activas = todas.filter(vigente);

  // --- 4. ordenar: el mejor ahorro real primero ---
  // Sin tope gana siempre; despues manda el tope, y a igualdad el porcentaje.
  activas.sort((a, b) => {
    const techo = (p) =>
      p.descuento_pct == null ? -1 : p.tope_monto == null ? Infinity : p.tope_monto;
    const ta = techo(a);
    const tb = techo(b);
    if (ta !== tb) return tb - ta;
    return (b.descuento_pct ?? 0) - (a.descuento_pct ?? 0);
  });

  // --- 5. indice por dia, para que la PWA no filtre en runtime ---
  const porDia = Array.from({ length: 7 }, () => []);
  for (const p of activas) for (const d of p.dias ?? []) porDia[d].push(p.id);

  const bancos = [...new Set(activas.map((p) => p.banco))].sort((a, b) =>
    a.localeCompare(b, 'es'),
  );
  const comercios = [...new Set(activas.map((p) => p.comercio))].sort((a, b) =>
    a.localeCompare(b, 'es'),
  );

  const salida = {
    generado_at: new Date().toISOString(),
    total: activas.length,
    bancos,
    comercios,
    por_dia: porDia,
    promos: activas,
  };

  await mkdir(P('web'), { recursive: true });
  await writeFile(P('web', 'promos.json'), JSON.stringify(salida), 'utf8');

  const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  console.log(`\nDeduplicadas: ${dedup}  ·  vencidas descartadas: ${vencidas.length}`);
  console.log(`Publicadas:   ${activas.length} promos, ${bancos.length} bancos, ${comercios.length} comercios`);
  console.log(`\nPor día:  ${porDia.map((ids, d) => `${DIAS[d]} ${ids.length}`).join('  ')}`);
  console.log(`\n-> web/promos.json`);

  if (vencidas.length) {
    console.log('\nVencidas:');
    for (const p of vencidas) {
      console.log(`  ${p.comercio} / ${p.banco} — venció ${p.vigencia_hasta}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
