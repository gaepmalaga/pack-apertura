// El horario se puede enseñar de cuatro maneras, para que cada web tenga la
// suya. Devuelve HTML para que lo usen igual la página al compilar y el modo
// prueba del panel en el navegador. «Hoy» lo marca el navegador después.
import { DIAS, NOMBRE_DIA, agrupar, formatoTramo, type HorarioSemana } from './horario';

export type VistaHorario = 'filas' | 'semana' | 'agrupado' | 'hoy';

const INICIAL: Record<string, string> = { lunes: 'L', martes: 'M', miercoles: 'X', jueves: 'J', viernes: 'V', sabado: 'S', domingo: 'D' };

export function htmlHorario(vista: VistaHorario, semana: HorarioSemana): string {
  if (vista === 'semana') {
    return `<ol class="h-semana">${DIAS.map((d) => {
      const t = semana[d];
      const horas = t.length ? t.map((x) => `<span>${x.abre}</span><span>${x.cierra}</span>`).join('') : '<span class="cerrado">Cerrado</span>';
      return `<li data-dia="${d}"><b title="${NOMBRE_DIA[d]}">${INICIAL[d]}</b>${horas}</li>`;
    }).join('')}</ol>`;
  }
  const grupos = agrupar(semana);
  if (vista === 'agrupado') {
    return `<ul class="h-agrupado">${grupos
      .map((g) => `<li data-dias="${g.claves.join(',')}"><span>${g.dias}</span><strong>${g.tramos.length ? g.tramos.join(' · ') : 'Cerrado'}</strong></li>`)
      .join('')}</ul>`;
  }
  if (vista === 'hoy') {
    return `<div class="h-hoy"><p class="h-hoy-etq">Hoy</p><p class="h-hoy-horas" data-hoy>${grupos[0]?.tramos.join(' · ') || 'Cerrado'}</p>
      <ul class="h-resto">${grupos.map((g) => `<li data-dias="${g.claves.join(',')}"><span>${g.dias}</span> ${g.tramos.length ? g.tramos.join(' · ') : 'cerrado'}</li>`).join('')}</ul></div>`;
  }
  return `<table class="h-filas"><tbody>${DIAS.map(
    (d) => `<tr data-dia="${d}"><th scope="row">${NOMBRE_DIA[d]}</th><td>${semana[d].length ? semana[d].map(formatoTramo).join(' · ') : 'Cerrado'}</td></tr>`,
  ).join('')}</tbody></table>`;
}

/** Marca el día de hoy en cualquiera de las vistas y rellena «Hoy» si la vista lo tiene. */
export function marcarHoy(raiz: ParentNode, dia: string, semana: HorarioSemana) {
  raiz.querySelectorAll<HTMLElement>('[data-dia]').forEach((el) => el.classList.toggle('hoy', el.dataset.dia === dia));
  raiz.querySelectorAll<HTMLElement>('[data-dias]').forEach((el) => el.classList.toggle('hoy', (el.dataset.dias ?? '').split(',').includes(dia)));
  const hoy = semana[dia as keyof HorarioSemana] ?? [];
  raiz.querySelectorAll<HTMLElement>('[data-hoy]').forEach((el) => (el.textContent = hoy.length ? hoy.map(formatoTramo).join(' · ') : 'Hoy cerramos'));
}
