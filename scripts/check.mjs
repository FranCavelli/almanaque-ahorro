/** Humo: recorre la app entera y reporta errores de consola. node scripts/check.mjs */

import { chromium, devices } from 'playwright';

const URL_BASE = process.env.URL ?? 'http://localhost:5178';
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['Pixel 7'], locale: 'es-AR' });
const page = await ctx.newPage();

const problemas = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') problemas.push(`[${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => problemas.push(`[pageerror] ${e.message}`));
page.on('requestfailed', (r) => problemas.push(`[404?] ${r.url()} — ${r.failure()?.errorText}`));

await page.goto(URL_BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await page.locator('#carteraListo').click().catch(() => {});

// Recorremos los siete días del riel.
for (let i = 0; i < 7; i++) {
  await page.locator('.riel__dia').nth(i).click();
  await page.waitForTimeout(200);
}

// Abrimos la cartera, marcamos uno, cerramos.
await page.locator('#abrirCartera').click();
await page.waitForTimeout(300);
await page.locator('.chip').first().click();
await page.waitForTimeout(300);
await page.locator('#carteraListo').click();
await page.waitForTimeout(400);

// Teclado.
await page.keyboard.press('ArrowRight');
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(300);

const archivoOk = await page.evaluate(() => document.fonts.check('900 16px Archivo'));
const tap = await page.evaluate(() => {
  const chicos = [];
  for (const el of document.querySelectorAll('button, a')) {
    const r = el.getBoundingClientRect();
    if (r.width && r.height && (r.height < 44 || r.width < 44)) {
      chicos.push(`${el.className || el.tagName} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
  }
  return chicos;
});

console.log(problemas.length ? problemas.join('\n') : 'Consola limpia.');
console.log(`\nArchivo cargada: ${archivoOk}`);
console.log(tap.length ? `\nObjetivos táctiles < 44px:\n  ${tap.join('\n  ')}` : '\nTodos los targets ≥ 44px.');

await browser.close();
