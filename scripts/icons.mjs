/**
 * Regenera los PNG del ícono a partir de web/icon.svg.
 * Se corre a mano cuando cambia el ícono: node scripts/icons.mjs
 * Usa el Chromium que ya instaló Playwright para el scraper.
 */

import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..', 'web');
const svg = await readFile(join(WEB, 'icon.svg'), 'utf8');
const cuerpo = svg.replace(/<\/?svg[^>]*>/g, '');

// Maskable: el troquel de Android recorta hasta un 20% del borde, asi que
// metemos la hoja adentro de un campo cobalto con margen de seguridad.
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#1B3FA8"/>
  <g transform="translate(70,70) scale(0.727)">${cuerpo}</g>
</svg>`;

const browser = await chromium.launch();

for (const [name, source, size] of [
  ['icon-192.png', svg, 192],
  ['icon-512.png', svg, 512],
  ['icon-180.png', svg, 180],
  ['icon-maskable.png', maskable, 512],
]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${source}`,
  );
  await page.waitForTimeout(250);
  await page.screenshot({ path: join(WEB, name) });
  console.log(`  ${name}  ${size}x${size}`);
  await page.close();
}

await browser.close();
