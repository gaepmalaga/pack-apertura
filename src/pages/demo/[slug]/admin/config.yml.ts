import type { APIRoute } from 'astro';
import { negocios } from '../../../../lib/negocios';
import { configPanel } from '../../../../lib/panel';

export const getStaticPaths = () => negocios.map((n) => ({ params: { slug: n.slug }, props: { negocio: n } }));

// YAML acepta JSON tal cual, así que el config.yml se escribe como JSON.
export const GET: APIRoute = ({ props }) =>
  new Response(JSON.stringify(configPanel([props.negocio], `/demo/${props.negocio.slug}/`), null, 2), {
    headers: { 'Content-Type': 'text/yaml; charset=utf-8' },
  });
