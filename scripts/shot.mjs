/** Capturas de la PWA para revisión visual. node scripts/shot.mjs */

import { chromium, devices } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.shots');
const URL_BASE = process.env.URL ?? 'http://localhost:5178';

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

const vistas = [
  ['movil', { ...devices['Pixel 7'] }],
  ['movil-chico', { viewport: { width: 320, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }],
  ['escritorio', { viewport: { width: 1280, height: 900 } }],
];

for (const [nombre, opciones] of vistas) {
  const ctx = await browser.newContext({ ...opciones, locale: 'es-AR' });
  const page = await ctx.newPage();
  await page.goto(URL_BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800); // dejamos que dispare la cartera de primera visita

  // Cerramos la cartera si se abrió sola (primera visita)
  const listo = page.locator('#carteraListo');
  if (await listo.isVisible().catch(() => false)) {
    await listo.click();
    await page.waitForTimeout(400);
  }

  await page.screenshot({ path: join(OUT, `${nombre}.png`), fullPage: false });
  await page.screenshot({ path: join(OUT, `${nombre}-completo.png`), fullPage: true });
  console.log(`  ${nombre}`);

  // Cartera abierta
  await page.locator('#abrirCartera').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, `${nombre}-cartera.png`) });

  // Modo oscuro
  await ctx.close();

  const ctxDark = await browser.newContext({ ...opciones, locale: 'es-AR', colorScheme: 'dark' });
  const pd = await ctxDark.newPage();
  await pd.goto(URL_BASE, { waitUntil: 'networkidle' });
  await pd.waitForTimeout(1800);
  const listoD = pd.locator('#carteraListo');
  if (await listoD.isVisible().catch(() => false)) { await listoD.click(); await pd.waitForTimeout(400); }
  await pd.screenshot({ path: join(OUT, `${nombre}-oscuro.png`) });
  await ctxDark.close();
}

await browser.close();
console.log(`\n-> ${OUT}`);
