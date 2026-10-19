import type { APIRoute } from 'astro';
import { negocios } from '../../lib/negocios';
import { configPanel } from '../../lib/panel';

export const GET: APIRoute = () =>
  new Response(JSON.stringify(configPanel(negocios, '/'), null, 2), { headers: { 'Content-Type': 'text/yaml; charset=utf-8' } });
