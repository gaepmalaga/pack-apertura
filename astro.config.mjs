// @ts-check
import { defineConfig } from 'astro/config';

// La dirección pública y la subcarpeta llegan del workflow de GitHub Pages, así
// la misma plantilla sirve en gaepmalaga.github.io/<repo>/ o en un dominio propio.
const SITE_URL = process.env.SITE_URL || 'https://gaepmalaga.github.io';
const BASE_PATH = process.env.BASE_PATH || '/pack-apertura';

export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  trailingSlash: 'always',
  build: { format: 'directory' },
  devToolbar: { enabled: false },
});
