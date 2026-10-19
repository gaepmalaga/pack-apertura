#!/usr/bin/env node
// Hace una captura de móvil de cada demo para las miniaturas de la landing
// (public/capturas/<slug>.jpg). Se lanza a mano tras crear o cambiar una demo:
//
//   npm run build && npm run preview          (en otra terminal)
//   node herramientas/capturas.mjs [http://localhost:4321/pack-apertura]
//
// Usa el Chromium que haya en el sistema (CHROMIUM_PATH) o el de Playwright.
import { chromium } from 'playwright-core';
import { readdirSync } from 'node:fs';

const base = (process.argv[2] || 'http://localhost:4321/pack-apertura').replace(/\/$/, '');
const slugs = readdirSync('src/negocios').filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const pagina = await navegador.newPage({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 1.5 });
for (const slug of slugs) {
  await pagina.goto(`${base}/demo/${slug}/`, { waitUntil: 'networkidle' });
  // Sin el aviso de demo: la miniatura enseña la web tal como la vería el cliente.
  await pagina.addStyleTag({ content: '.aviso-demo,.barra-movil{display:none!important}' });
  await pagina.waitForTimeout(300);
  await pagina.screenshot({ path: `public/capturas/${slug}.jpg`, type: 'jpeg', quality: 78 });
  console.log(`public/capturas/${slug}.jpg`);
}
await navegador.close();
