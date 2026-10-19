import type { APIRoute } from 'astro';
import { negocios } from '../../../../lib/negocios';
import { htmlPanel } from '../../../../lib/panel';

export const getStaticPaths = () => negocios.map((n) => ({ params: { slug: n.slug }, props: { nombre: n.nombre } }));

export const GET: APIRoute = ({ props }) =>
  new Response(htmlPanel(`Panel · ${props.nombre}`), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
