// Horario de Taller.Es como una línea de tiempo: una pista por día con la franja
// en la que está abierto, y una raya de «ahora» que pone el navegador. Lo usa la
// página al compilar y otra vez en el navegador si el panel de prueba cambia el
// horario. Sin dependencias del DOM para poder ejecutarse en Astro.
import { DIAS, NOMBRE_DIA, aMinutos, formatoTramo, type Dia, type HorarioSemana } from '../../lib/horario';

const CORTO: Record<Dia, string> = { lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom' };

/** Horas enteras que abarca la línea: una antes de abrir y una después de cerrar. */
export function rango(semana: HorarioSemana) {
  const tramos = DIAS.flatMap((d) => semana[d]).filter((t) => aMinutos(t.cierra) > aMinutos(t.abre));
  if (!tramos.length) return { desde: 7, hasta: 20 };
  const desde = Math.max(0, Math.floor(Math.min(...tramos.map((t) => aMinutos(t.abre))) / 60) - 1);
  const hasta = Math.min(24, Math.ceil(Math.max(...tramos.map((t) => aMinutos(t.cierra))) / 60) + 1);
  return { desde, hasta };
}

/** Posición en % de un minuto del día dentro de la línea. */
export function posicion(minuto: number, semana: HorarioSemana) {
  const { desde, hasta } = rango(semana);
  return ((minuto - desde * 60) / ((hasta - desde) * 60)) * 100;
}

const hora = (h: string) => h.replace(/^0(\d)/, '$1');

export function htmlLinea(semana: HorarioSemana): string {
  const { desde, hasta } = rango(semana);
  const pos = (m: number) => posicion(m, semana).toFixed(3);
  const paso = hasta - desde > 12 ? 3 : 2;
  const marcas: string[] = [];
  for (let h = desde + 1; h < hasta; h += paso) marcas.push(`<span style="left:${pos(h * 60)}%">${h}:00</span>`);
  const filas = DIAS.map((d) => {
    const tramos = semana[d];
    const franjas = tramos
      .map((t) => {
        const a = aMinutos(t.abre);
        const c = aMinutos(t.cierra) <= a ? hasta * 60 : aMinutos(t.cierra);
        return `<span class="ln-tramo" style="left:${pos(a)}%;width:${(posicion(c, semana) - posicion(a, semana)).toFixed(3)}%"></span>`;
      })
      .join('');
    const texto = tramos.length ? tramos.map((t) => formatoTramo({ abre: hora(t.abre), cierra: hora(t.cierra) })).join(' · ') : 'Cerrado';
    return `<li data-dia="${d}"${tramos.length ? '' : ' class="cerrado"'}><span class="ln-dia" title="${NOMBRE_DIA[d]}">${CORTO[d]}</span><span class="ln-pista">${franjas}</span><span class="ln-horas">${texto}</span></li>`;
  }).join('');
  return `<div class="ln"><div class="ln-marcas" aria-hidden="true">${marcas.join('')}</div><ol class="ln-dias">${filas}</ol><div class="ln-ahora" data-ahora hidden><span data-ahora-texto></span></div></div>`;
}

/** La hora a la que se abre casi siempre («7:30»), para el titular. */
export function aperturaHabitual(semana: HorarioSemana) {
  const cuenta = new Map<string, number>();
  for (const d of DIAS) {
    const t = semana[d][0];
    if (t) cuenta.set(t.abre, (cuenta.get(t.abre) ?? 0) + 1);
  }
  const [mejor] = [...cuenta.entries()].sort((a, b) => b[1] - a[1] || aMinutos(a[0]) - aMinutos(b[0]));
  return mejor ? hora(mejor[0]) : '';
}
