import type { APIRoute } from 'astro';
import { htmlPanel } from '../../lib/panel';

export const GET: APIRoute = () => new Response(htmlPanel('Panel · Todas las webs'), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
