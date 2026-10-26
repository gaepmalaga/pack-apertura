// Cada negocio es un JSON en src/negocios/<slug>.json. El nombre del archivo es
// la dirección de su demo: /demo/<slug>/. Para añadir una demo basta con copiar
// uno de los JSON existentes y cambiar los datos.
import type { Dia } from './horario';

export type Plato = {
  id?: string;
  nombre: string;
  descripcion?: string;
  precio?: number;
  /** Foto del plato. Si también hay vídeo, es la imagen que se ve antes de que arranque. */
  foto?: string;
  /** Vídeo corto en vertical, como un reel: se ve en la carta y a pantalla completa. */
  video?: string;
};
export type GrupoCarta = { titulo: string; tipo?: 'comer' | 'beber'; platos: Plato[] };

export type Negocio = {
  slug: string;
  /** Demo sin encargar: muestra el aviso de «propuesta» y Google no la indexa. */
  demo: boolean;
  sector: 'bar' | 'taller' | 'estetica' | 'salud' | 'veterinaria' | 'tienda' | 'otro';
  nombre: string;
  rotulo?: string;
  bajoRotulo?: string;
  eslogan: string;
  descripcion: string;
  /** Rutas dentro de /public (sin barra inicial): negocios/<slug>/logo.webp… */
  logo?: string;
  /** Portada «cine»: vídeo de fondo en bucle y la imagen que se ve mientras carga. */
  videoPortada?: string;
  fotoPortada?: string;
  /** Foto junto a la presentación: la fachada o el local. */
  fotoCasa?: string;
  /** Fotos del sitio, con una frase debajo de cada una. */
  galeria?: { foto: string; texto: string }[];
  tema: {
    estilo: 'taberna' | 'elegante' | 'moderno';
    fondo: string;
    tinta: string;
    acento: string;
    sobreAcento?: string;
    /** Segundo color de la casa, para adornos (el zócalo de festones de la portada «sello»). */
    secundario?: string;
    /** Composición de la portada (ver components/Portada.astro). */
    portada?: 'rotulo' | 'cartel' | 'ficha' | 'banda' | 'dividida' | 'sello' | 'cine';
    /** Detalle decorativo propio: toldo de rayas, cuadrícula de taller, olas o festones (el borde ondulado de pared infantil). */
    adorno?: 'ninguno' | 'toldo' | 'cuadricula' | 'olas' | 'festones';
    /** Carta en tarjetas por sección o como una carta impresa de una columna. */
    carta?: 'tarjetas' | 'menu';
    /** Esquinas: redondo (botones de píldora), suave (8 px) o recto. */
    forma?: 'redondo' | 'suave' | 'recto';
    horario?: 'filas' | 'semana' | 'agrupado' | 'hoy';
    mapa?: 'tarjeta' | 'grande' | 'enmarcado';
    /** Cómo se separan las secciones: líneas, bandas de color alternas o solo aire. */
    secciones?: 'lineas' | 'bandas' | 'aire';
  };
  contacto: {
    telefono?: string;
    whatsapp?: string;
    email?: string;
    instagram?: string;
    facebook?: string;
    /** Enlace de invitación a su comunidad o canal de WhatsApp (avisos de horarios, talleres…). */
    comunidad?: string;
  };
  direccion: {
    calle: string;
    zona?: string;
    cp?: string;
    ciudad: string;
    comoLlegar?: string;
    mapa?: string;
    /** Coordenadas para el mapa integrado (OpenStreetMap). */
    geo?: { lat: number; lng: number };
  };
  horario: { dia: Dia; abre: string; cierra: string }[];
  horarioNota?: string;
  destacados?: { titulo: string; texto: string; foto?: string }[];
  combos?: { nombre: string; descripcion: string; precio?: number }[];
  carta?: GrupoCarta[];
  cartaNota?: string;
  servicios?: { nombre: string; descripcion: string; precio?: string }[];
  /** Etapas de la vida (veterinaria, pediatría…): qué toca en cada edad, como una línea de tiempo. */
  etapas?: { titulo: string; edad: string; texto: string }[];
  reservas?: {
    activas: boolean;
    titulo?: string;
    texto?: string;
    /** Qué se reserva: «Mesa», o la lista de servicios de una estética o un taller. */
    opciones?: string[];
    personas?: boolean;
  };
  resenas?: { autor: string; texto: string; estrellas?: number }[];
  enlaceResenas?: string;
  faq?: { pregunta: string; respuesta: string }[];
};

const archivos = import.meta.glob<Omit<Negocio, 'slug'>>('../negocios/*.json', { eager: true, import: 'default' });

export const negocios: Negocio[] = Object.entries(archivos)
  .map(([ruta, datos]) => ({ ...datos, slug: ruta.split('/').pop()!.replace(/\.json$/, '') }))
  .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

export const soloDigitos = (s = '') => s.replace(/\D/g, '');

export function telHref(n: Negocio) {
  const t = soloDigitos(n.contacto.telefono);
  return t ? `tel:+34${t.replace(/^34/, '')}` : '';
}

export function waHref(n: Negocio, texto = '') {
  const w = soloDigitos(n.contacto.whatsapp);
  if (!w) return '';
  const numero = w.length === 9 ? `34${w}` : w;
  return `https://wa.me/${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
}

export function direccionTexto(n: Negocio) {
  const d = n.direccion;
  return [d.calle, [d.cp, d.zona].filter(Boolean).join(' '), d.ciudad].filter(Boolean).join(', ');
}

export function mapaHref(n: Negocio) {
  return n.direccion.mapa || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${n.nombre}, ${direccionTexto(n)}`)}`;
}

export const euros = (p?: number) =>
  typeof p === 'number' ? `${p.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : '';

export const NOMBRE_SECTOR: Record<Negocio['sector'], string> = {
  bar: 'Bar y restaurante',
  taller: 'Taller',
  estetica: 'Estética y peluquería',
  salud: 'Salud',
  veterinaria: 'Veterinaria',
  tienda: 'Tienda',
  otro: 'Negocio local',
};

/** Ruta interna con la subcarpeta de GitHub Pages delante. */
export const url = (ruta: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}${ruta}`;

/** Dirección de una foto o un vídeo del JSON. Las rutas de /public van sin barra
 *  inicial; el panel real guarda las suyas ya completas (/<repo>/fotos/…). */
export const medio = (ruta = '') => (!ruta ? '' : /^(\/|https?:|blob:|data:)/.test(ruta) ? ruta : url(`/${ruta}`));
