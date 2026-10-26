// HTML de la carta. Lo usan la página (al generarse) y el modo prueba del panel
// (en el navegador, con los cambios del dueño), así las dos pintan lo mismo.
// Las rutas de foto y vídeo llegan ya resueltas.
export type PlatoVista = { nombre: string; descripcion?: string; precio?: number; foto?: string; video?: string };
export type GrupoVista = { titulo: string; platos: PlatoVista[] };

const escapar = (s = '') => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const eurosCarta = (p?: number) =>
  typeof p === 'number' && !Number.isNaN(p) ? `${p.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : '';

export const idGrupo = (t: string) => 'g-' + t.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function htmlPlato(p: PlatoVista, id: string, grupo: string) {
  const nombre = escapar(p.nombre);
  // La miniatura abre el reel; el resto del plato lo apunta en la lista.
  const miniatura =
    p.foto || p.video
      ? `<button type="button" class="miniatura" data-ver-reel="${id}" aria-label="Ver ${p.video ? 'el vídeo' : 'la foto'} de ${nombre}">${
          p.foto
            ? `<img src="${escapar(p.foto)}" alt="" loading="lazy" />`
            : `<video src="${escapar(p.video)}#t=0.1" muted playsinline preload="metadata" aria-hidden="true"></video>`
        }${p.video ? '<span class="play" aria-hidden="true"></span>' : ''}</button>`
      : '';
  return `<li${miniatura ? ' class="con-medio"' : ''}>${miniatura}<button type="button" class="plato" data-id="${id}" data-plato="${nombre}" data-precio="${p.precio ?? 0}" data-cuantos="0" data-grupo="${escapar(grupo)}" data-desc="${escapar(p.descripcion)}" data-foto="${escapar(p.foto)}" data-video="${escapar(p.video)}">
<span class="n">${nombre}</span><span class="puntos" aria-hidden="true"></span><span class="p">${eurosCarta(p.precio)}</span>${
    p.descripcion ? `<span class="d">${escapar(p.descripcion)}</span>` : ''
  }</button></li>`;
}

export const htmlGrupo = (g: GrupoVista) =>
  `<div class="grupo" id="${idGrupo(g.titulo)}"><h3>${escapar(g.titulo)}</h3><ul class="platos">${g.platos
    .map((p, i) => htmlPlato(p, `${idGrupo(g.titulo)}-${i}`, g.titulo))
    .join('')}</ul></div>`;
