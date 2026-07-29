/**
 * Etapa 1 — Scraping.
 *
 * Baja cada fuente y guarda TEXTO PLANO en data/raw/<id>.txt, mas un indice
 * en data/raw/_index.json con metadata de la corrida.
 *
 * No intenta entender nada: eso es trabajo de la etapa 2. Aca solo importa
 * traer el texto lo mas limpio posible y dejar registro de que fallo.
 *
 * Uso:
 *   node scripts/scrape.mjs              # todas las fuentes
 *   node scripts/scrape.mjs bna carrefour  # solo algunas
 */

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCES } from '../src/sources.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW_DIR = join(ROOT, 'data', 'raw');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/** Por debajo de esto asumimos que agarramos un shell vacio y no contenido real. */
const THIN_THRESHOLD = 900;

/** Tags cuyo contenido nunca aporta y solo gasta tokens. */
const DROP_TAGS = /<(script|style|noscript|svg|iframe|template)[\s\S]*?<\/\1>/gi;

function htmlToText(html) {
  return html
    .replace(DROP_TAGS, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6])\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&(quot|#34);/gi, '"')
    .replace(/&(#39|apos);/gi, "'")
    .replace(/&(lt|gt);/gi, ' ')
    .replace(/&#8220;|&#8221;/g, '"')
    .split('\n')
    .map((l) => l.replace(/[ \t ]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

/**
 * Colapsa lineas repetidas consecutivas (menus, breadcrumbs duplicados).
 *
 * El limite es una red de contencion contra una pagina patologica, NO una
 * politica de ahorro: cortar a 24k tiraba mas de la mitad de la pagina de
 * Carrefour (56k) y con ella promos reales, en silencio. Si igual se corta,
 * se avisa y queda registrado en el indice; la etapa 2 parte los textos
 * largos en tandas en lugar de perderlos.
 */
const LIMITE_DURO = 200000;

function condense(text) {
  const out = [];
  let prev = null;
  for (const line of text.split('\n')) {
    if (line === prev) continue;
    prev = line;
    out.push(line);
  }
  const joined = out.join('\n');
  if (joined.length <= LIMITE_DURO) return { texto: joined, truncado: false };
  return {
    texto: joined.slice(0, LIMITE_DURO) + '\n\n[...cortado por limite duro...]',
    truncado: true,
  };
}

async function viaFetch(source) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch(source.url, {
      headers: { 'user-agent': UA, 'accept-language': 'es-AR,es;q=0.9' },
      signal: ctrl.signal,
      redirect: 'follow',
    });
    const html = await res.text();
    return { status: res.status, text: htmlToText(html) };
  } finally {
    clearTimeout(timer);
  }
}

let browserPromise = null;
async function getBrowser() {
  if (!browserPromise) {
    const { chromium } = await import('playwright');
    browserPromise = chromium.launch({
      headless: true,
      // Varios sitios de bancos rompen la negociacion HTTP/2 contra Chromium headless
      // y tiran ERR_HTTP2_PROTOCOL_ERROR. Forzar HTTP/1.1 los destraba.
      args: ['--disable-http2', '--disable-blink-features=AutomationControlled'],
    });
  }
  return browserPromise;
}

async function viaBrowser(source) {
  const browser = await getBrowser();
  const ctx = await browser.newContext({
    userAgent: UA,
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
    viewport: { width: 1280, height: 1600 },
    ignoreHTTPSErrors: source.insecure === true,
  });

  // Cortamos imagenes/fuentes/media: no aportan texto y triplican el tiempo de carga.
  await ctx.route('**/*', (route) => {
    const t = route.request().resourceType();
    return t === 'image' || t === 'font' || t === 'media' ? route.abort() : route.continue();
  });

  const page = await ctx.newPage();
  let status = 0;
  try {
    // 'commit' resuelve apenas llega la respuesta, sin esperar subrecursos.
    // Sitios pesados (Santander) colgaban 'domcontentloaded' hasta el timeout;
    // la espera real de contenido la hacen waitFor + settle mas abajo.
    const res = await page.goto(source.url, { waitUntil: 'commit', timeout: 60000 });
    status = res?.status() ?? 0;

    if (source.waitFor) {
      await page.waitForSelector(source.waitFor, { timeout: 15000 }).catch(() => {});
    }
    // Muchos sitios hidratan las promos despues del primer paint.
    await page.waitForTimeout(source.settle ?? 2500);

    if (source.scroll) {
      // Lazy-load: bajamos en tramos para disparar los observers, y volvemos
      // arriba por si el contenido se monta recien al re-entrar al viewport.
      for (let i = 0; i < 8; i++) {
        await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.85));
        await page.waitForTimeout(700);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(1200);
    }

    // Algunos sitios esconden el detalle de cada promo detras de un acordeon.
    // Abrimos todo lo que parezca un toggle antes de leer el texto.
    await page
      .evaluate(() => {
        const sel = '[aria-expanded="false"], details:not([open])';
        for (const el of document.querySelectorAll(sel)) {
          if (el.tagName === 'DETAILS') el.setAttribute('open', '');
          else el.click?.();
        }
      })
      .catch(() => {});
    await page.waitForTimeout(1200);

    const root = source.scope ?? 'body';
    const text = await page.evaluate((sel) => {
      const el = document.querySelector(sel) ?? document.body;
      // innerText respeta lo que el usuario efectivamente ve (ignora display:none).
      return el.innerText;
    }, root);

    return { status, text: htmlToText(text) };
  } finally {
    await ctx.close();
  }
}

async function scrapeOne(source, previo) {
  const started = Date.now();
  try {
    const { status, text: rawText } = source.mode === 'browser'
      ? await viaBrowser(source)
      : await viaFetch(source);

    const { texto, truncado } = condense(rawText);
    const thin = texto.length < THIN_THRESHOLD;

    /**
     * Una SPA que no llego a hidratar devuelve un shell chiquito y valido.
     * Si eso pisa el archivo anterior, perdemos datos buenos y nadie se entera:
     * fue exactamente lo que paso con Carrefour, que de 56k paso a 734 chars.
     * Ante una caida brusca conservamos lo que ya teniamos.
     */
    const derrumbe = previo?.chars > 3000 && texto.length < previo.chars * 0.5;

    if (!derrumbe) {
      await writeFile(join(RAW_DIR, `${source.id}.txt`), texto, 'utf8');
    }

    return {
      id: source.id,
      label: source.label,
      url: source.url,
      mode: source.mode,
      status,
      chars: derrumbe ? previo.chars : texto.length,
      thin,
      truncado,
      derrumbe,
      ok: derrumbe ? true : !thin && status >= 200 && status < 400,
      ms: Date.now() - started,
      error: null,
    };
  } catch (err) {
    return {
      id: source.id,
      label: source.label,
      url: source.url,
      mode: source.mode,
      status: 0,
      chars: 0,
      thin: true,
      ok: false,
      ms: Date.now() - started,
      error: `${err.name}: ${err.message}`,
    };
  }
}

async function main() {
  const only = process.argv.slice(2);
  const targets = only.length ? SOURCES.filter((s) => only.includes(s.id)) : SOURCES;

  if (!targets.length) {
    console.error('No hay fuentes que coincidan con:', only.join(', '));
    process.exit(1);
  }

  await mkdir(RAW_DIR, { recursive: true });

  // Lo que sabiamos de la corrida anterior, para detectar derrumbes.
  const indexPathPrevio = join(RAW_DIR, '_index.json');
  const anterior = new Map(
    (existsSync(indexPathPrevio)
      ? JSON.parse(await readFile(indexPathPrevio, 'utf8')).fuentes ?? []
      : []
    ).map((f) => [f.id, f]),
  );

  console.log(`Scrapeando ${targets.length} fuente(s)...\n`);

  const results = [];
  // De a 3 en paralelo: suficiente para no esperar de mas, sin martillar a nadie.
  for (let i = 0; i < targets.length; i += 3) {
    const batch = targets.slice(i, i + 3);
    results.push(...(await Promise.all(batch.map((s) => scrapeOne(s, anterior.get(s.id))))));
  }

  for (const r of results) {
    const mark = r.error ? 'ERR ' : r.derrumbe ? 'CAIDA' : r.ok ? 'OK  ' : 'THIN';
    let detail = r.error ?? `${r.chars} chars, HTTP ${r.status}`;
    if (r.derrumbe) detail += '  <- vino casi vacia, conservo lo anterior';
    if (r.truncado) detail += '  <- CORTADO por limite duro';
    console.log(`${mark} ${r.id.padEnd(20)} ${String(r.ms + 'ms').padStart(7)}  ${detail}`);
  }

  /* Si se scrapea un subconjunto, el indice se MERGEA. Pisarlo con solo esas
     fuentes borraba del mapa a las demas, cuyos .txt siguen en disco, y la
     etapa siguiente nunca las miraba. */
  const indexPath = join(RAW_DIR, '_index.json');
  const previo = existsSync(indexPath)
    ? JSON.parse(await readFile(indexPath, 'utf8')).fuentes ?? []
    : [];

  const porId = new Map(previo.map((f) => [f.id, f]));
  for (const r of results) porId.set(r.id, r);

  // Sacamos del indice lo que ya no existe en el registro de fuentes.
  const vigentes = new Set(SOURCES.map((s) => s.id));
  const fuentes = [...porId.values()].filter((f) => vigentes.has(f.id));

  const index = { generado: new Date().toISOString(), fuentes };
  await writeFile(indexPath, JSON.stringify(index, null, 2), 'utf8');

  const ok = results.filter((r) => r.ok).length;
  console.log(`\n${ok}/${results.length} fuentes con contenido util -> data/raw/`);

  if (browserPromise) (await browserPromise).close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
