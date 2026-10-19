#!/usr/bin/env node
// Convierte el datos/contenido.json de las tabernas de webtaller al formato de
// esta plantilla (src/negocios/<slug>.json).
//
//   node herramientas/importar-taberna.mjs <contenido.json> <slug> [tema-json]
//
// Las propuestas «por dónde empezar» pasan a combos con el precio sumado de lo
// que llevan. Los textos con <b> se quedan en texto plano.
import { readFileSync, writeFileSync } from 'node:fs';

const [, , origen, slug, temaJson] = process.argv;
if (!origen || !slug) {
  console.error('Uso: node herramientas/importar-taberna.mjs <contenido.json> <slug> [tema-json]');
  process.exit(1);
}
const d = JSON.parse(readFileSync(origen, 'utf8'));
const limpio = (s = '') => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const hhmm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

const precios = Object.fromEntries(d.grupos.flatMap((g) => g.platos.map((p) => [p.id, p.precio])));
const horario = [];
for (const [k, tramos] of Object.entries(d.horario || {})) {
  for (const [a, c] of tramos || []) horario.push({ dia: DIAS[Number(k)], abre: hhmm(a), cierra: hhmm(c) });
}
const n = d.negocio;
const salida = {
  demo: true,
  sector: 'bar',
  nombre: n.nombre,
  rotulo: n.rotulo,
  bajoRotulo: n.bajoRotulo,
  eslogan: limpio(d.textos.lema),
  descripcion: [limpio(d.textos.introUno), limpio(d.textos.introDos)].filter(Boolean).join(' '),
  tema: temaJson ? JSON.parse(temaJson) : { estilo: 'taberna', fondo: '#111111', tinta: '#f5f1e8', acento: '#f7e27c' },
  contacto: { telefono: n.telefono || '', whatsapp: n.whatsapp || '', email: n.correo || '', instagram: n.instagram || '' },
  direccion: {
    calle: n.calle,
    zona: n.barrio,
    cp: n.cp,
    ciudad: n.ciudad,
    comoLlegar: n.comoLlegar || (n.metro ? `Metro: ${n.metro}.` : ''),
    mapa: n.mapa || '',
  },
  horario,
  combos: (d.escenarios || []).map((e) => ({
    nombre: e.nombre,
    descripcion: limpio(e.descripcion),
    precio: Math.round(e.lleva.reduce((s, [id, u]) => s + (precios[id] || 0) * u, 0) * 100) / 100,
  })),
  carta: d.grupos.map((g) => ({
    titulo: g.titulo,
    tipo: g.tipo || 'comer',
    platos: g.platos.map((p) => ({ id: p.id, nombre: p.nombre, descripcion: limpio(p.descripcion), precio: p.precio })),
  })),
  cartaNota: limpio(d.textos.cartaIva || ''),
  reservas: {
    activas: Boolean(n.telefono || n.whatsapp),
    titulo: 'Reservar mesa',
    texto: limpio(d.textos.avisarTexto || 'Para mesa, para grupo o para preguntar qué hay hoy fuera de carta.'),
    opciones: ['Mesa'],
    personas: true,
  },
};
writeFileSync(`src/negocios/${slug}.json`, JSON.stringify(salida, null, 2) + '\n');
console.log(`src/negocios/${slug}.json: ${salida.carta.reduce((s, g) => s + g.platos.length, 0)} platos, ${horario.length} tramos de horario`);
