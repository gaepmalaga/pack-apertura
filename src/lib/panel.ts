// Configuración de Sveltia CMS (https://github.com/sveltia/sveltia-cms), el panel
// /admin. Edita los JSON de src/negocios directamente en GitHub: cada «Guardar»
// es un commit a main, y el workflow vuelve a publicar la web en un par de minutos.
// Se entra con un token de GitHub («Sign In with Token»), sin servidor propio.
import type { Negocio } from './negocios';

const REPO = process.env.PANEL_REPO || 'gaepmalaga/pack-apertura';
const RAMA = process.env.PANEL_RAMA || 'main';
const BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

const texto = (name: string, label: string, extra: Record<string, unknown> = {}) => ({ name, label, widget: 'string', required: false, ...extra });
const largo = (name: string, label: string, extra: Record<string, unknown> = {}) => ({ name, label, widget: 'text', required: false, ...extra });
const lista = (name: string, label: string, fields: unknown[], extra: Record<string, unknown> = {}) => ({ name, label, widget: 'list', required: false, fields, ...extra });

export const camposNegocio = (slug: string) => [
  { name: 'demo', label: 'Es una demo (aviso de «propuesta» y oculta a Google)', widget: 'boolean', default: true },
  {
    name: 'sector',
    label: 'Sector',
    widget: 'select',
    options: [
      { label: 'Bar o restaurante', value: 'bar' },
      { label: 'Taller', value: 'taller' },
      { label: 'Estética o peluquería', value: 'estetica' },
      { label: 'Salud', value: 'salud' },
      { label: 'Veterinaria', value: 'veterinaria' },
      { label: 'Tienda', value: 'tienda' },
      { label: 'Otro', value: 'otro' },
    ],
  },
  texto('nombre', 'Nombre completo', { required: true }),
  texto('rotulo', 'Rótulo (lo que se ve en grande)'),
  texto('bajoRotulo', 'Debajo del rótulo'),
  texto('eslogan', 'Frase principal', { required: true }),
  largo('descripcion', 'Descripción', { required: true }),
  {
    name: 'tema',
    label: 'Colores y letra',
    widget: 'object',
    fields: [
      {
        name: 'estilo',
        label: 'Estilo',
        widget: 'select',
        options: [
          { label: 'Taberna (rótulo grueso)', value: 'taberna' },
          { label: 'Elegante (letra con serifa)', value: 'elegante' },
          { label: 'Moderno', value: 'moderno' },
        ],
      },
      texto('fondo', 'Color de fondo (#rrggbb)', { required: true }),
      texto('tinta', 'Color del texto (#rrggbb)', { required: true }),
      texto('acento', 'Color de acento (#rrggbb)', { required: true }),
      texto('sobreAcento', 'Texto encima del acento (#rrggbb)'),
    ],
  },
  {
    name: 'contacto',
    label: 'Contacto',
    widget: 'object',
    fields: [texto('telefono', 'Teléfono'), texto('whatsapp', 'WhatsApp'), texto('email', 'Correo'), texto('instagram', 'Instagram (sin @)'), texto('facebook', 'Facebook')],
  },
  {
    name: 'direccion',
    label: 'Dirección',
    widget: 'object',
    fields: [
      texto('calle', 'Calle y número', { required: true }),
      texto('zona', 'Barrio o zona'),
      texto('cp', 'Código postal'),
      texto('ciudad', 'Ciudad', { required: true }),
      largo('comoLlegar', 'Cómo llegar'),
      texto('mapa', 'Enlace de Google Maps'),
    ],
  },
  lista('horario', 'Horario (un tramo por línea; un día partido lleva dos)', [
    {
      name: 'dia',
      label: 'Día',
      widget: 'select',
      options: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'],
    },
    texto('abre', 'Abre (09:30)', { required: true }),
    texto('cierra', 'Cierra (20:00)', { required: true }),
  ], { summary: '{{fields.dia}} {{fields.abre}}–{{fields.cierra}}' }),
  largo('horarioNota', 'Nota del horario'),
  lista('destacados', 'Destacados', [texto('titulo', 'Título'), largo('texto', 'Texto')]),
  lista('combos', 'Propuestas «por dónde empezar»', [
    texto('nombre', 'Nombre'),
    largo('descripcion', 'Qué lleva'),
    { name: 'precio', label: 'Precio (€)', widget: 'number', value_type: 'float', required: false },
  ]),
  lista('carta', 'Carta', [
    texto('titulo', 'Sección (Raciones, Bebidas…)'),
    { name: 'tipo', label: 'Tipo', widget: 'select', options: ['comer', 'beber'], required: false },
    lista('platos', 'Platos', [
      texto('nombre', 'Nombre'),
      largo('descripcion', 'Descripción'),
      { name: 'precio', label: 'Precio (€)', widget: 'number', value_type: 'float', required: false },
      { name: 'foto', label: 'Foto', widget: 'image', required: false, media_folder: `/public/fotos/${slug}`, public_folder: `${BASE}/fotos/${slug}` },
    ], { summary: '{{fields.nombre}} · {{fields.precio}} €' }),
  ], { summary: '{{fields.titulo}}' }),
  texto('cartaNota', 'Nota al pie de la carta'),
  lista('servicios', 'Servicios', [texto('nombre', 'Nombre'), largo('descripcion', 'Descripción'), texto('precio', 'Precio (texto libre: «desde 25 €»)')]),
  lista('etapas', 'Etapas de la vida', [texto('titulo', 'Etapa'), texto('edad', 'Edad'), largo('texto', 'Qué toca')]),
  {
    name: 'reservas',
    label: 'Reservas',
    widget: 'object',
    required: false,
    fields: [
      { name: 'activas', label: 'Activar reservas por WhatsApp', widget: 'boolean', default: true },
      texto('titulo', 'Título'),
      largo('texto', 'Texto'),
      { name: 'opciones', label: 'Qué se puede reservar', widget: 'list', required: false },
      { name: 'personas', label: 'Preguntar número de personas', widget: 'boolean', default: false },
    ],
  },
  lista('resenas', 'Reseñas', [texto('autor', 'Autor'), largo('texto', 'Texto'), { name: 'estrellas', label: 'Estrellas', widget: 'number', value_type: 'int', min: 1, max: 5, required: false }]),
  texto('enlaceResenas', 'Enlace a las reseñas de Google'),
  lista('faq', 'Preguntas frecuentes', [texto('pregunta', 'Pregunta'), largo('respuesta', 'Respuesta')]),
];

/** Configuración del panel: de un negocio concreto o de todos (solo /admin/ raíz). */
export function configPanel(negocios: Pick<Negocio, 'slug' | 'nombre'>[], ruta: string) {
  return {
    backend: { name: 'github', repo: REPO, branch: RAMA, commit_messages: { update: 'Panel: actualiza {{path}}' } },
    media_folder: 'public/fotos',
    public_folder: `${BASE}/fotos`,
    site_url: `${process.env.SITE_URL || 'https://gaepmalaga.github.io'}${BASE}${ruta}`,
    collections: [
      {
        name: 'negocios',
        label: negocios.length === 1 ? 'Mi negocio' : 'Negocios',
        files: negocios.map((n) => ({
          name: n.slug,
          label: n.nombre,
          file: `src/negocios/${n.slug}.json`,
          format: 'json',
          fields: camposNegocio(n.slug),
        })),
      },
    ],
  };
}

export const htmlPanel = (titulo: string) => `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>${titulo}</title>
</head>
<body>
  <script src="https://unpkg.com/@sveltia/cms@0.227.0/dist/sveltia-cms.js"></script>
</body>
</html>
`;
