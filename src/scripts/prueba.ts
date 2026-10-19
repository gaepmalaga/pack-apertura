// Modo prueba del panel de las demos. El panel guarda los cambios en el propio
// navegador (localStorage) y la web los aplica al abrirse con ?prueba. Nada se
// publica: sirve para que el dueño del negocio vea cómo cambiaría su web.
import { porDia, resumenCorto, formatoTramo, type Dia } from '../lib/horario';

export type Prueba = {
  eslogan?: string;
  telefono?: string;
  horario?: { dia: Dia; abre: string; cierra: string }[];
  carta?: { titulo: string; platos: { nombre: string; descripcion?: string; precio?: number }[] }[];
};

export const clavePrueba = (slug: string) => `prueba-${slug}`;

export function leerPrueba(slug: string): Prueba | null {
  try {
    return JSON.parse(localStorage.getItem(clavePrueba(slug)) || 'null');
  } catch {
    return null;
  }
}

const euros = (p?: number) =>
  typeof p === 'number' && !Number.isNaN(p) ? `${p.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : '';

const texto = (s: string) => {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
};

/** Aplica los cambios de prueba a la página. Modifica datos.horario para que el «abierto ahora» los use. */
export function aplicarPrueba(datos: { slug: string; horario: unknown[]; admin: string }) {
  if (!new URLSearchParams(location.search).has('prueba')) return;
  const p = leerPrueba(datos.slug);
  if (!p) return;

  if (p.eslogan) document.querySelectorAll('[data-campo="eslogan"]').forEach((el) => (el.textContent = p.eslogan!));
  if (p.telefono) {
    const tel = `tel:+34${p.telefono.replace(/\D/g, '').replace(/^34/, '')}`;
    document.querySelectorAll('[data-campo="telefono"]').forEach((el) => (el.textContent = p.telefono!));
    document.querySelectorAll<HTMLAnchorElement>('a[href^="tel:"]').forEach((a) => (a.href = tel));
  }
  if (p.horario) {
    datos.horario = p.horario;
    const semana = porDia(p.horario);
    document.querySelectorAll('[data-campo="resumen"]').forEach((el) => (el.textContent = resumenCorto(semana) || 'Cerrado'));
    document.querySelectorAll<HTMLElement>('tr[data-dia]').forEach((fila) => {
      const tramos = semana[fila.dataset.dia as Dia] ?? [];
      fila.querySelector('td')!.textContent = tramos.length ? tramos.map(formatoTramo).join(' · ') : 'Cerrado';
    });
  }
  const grupos = document.querySelector('[data-carta-grupos]');
  if (p.carta && grupos) {
    grupos.innerHTML = p.carta
      .filter((g) => g.platos.length)
      .map(
        (g) => `<div class="grupo"><h3>${texto(g.titulo)}</h3><ul class="platos">${g.platos
          .map(
            (pl) => `<li><button type="button" class="plato" data-plato="${texto(pl.nombre)}" data-precio="${pl.precio ?? 0}" data-cuantos="0">
              <span class="n">${texto(pl.nombre)}</span><span class="puntos" aria-hidden="true"></span><span class="p">${euros(pl.precio)}</span>
              ${pl.descripcion ? `<span class="d">${texto(pl.descripcion)}</span>` : ''}</button></li>`,
          )
          .join('')}</ul></div>`,
      )
      .join('');
  }

  const aviso = document.createElement('div');
  aviso.className = 'aviso-prueba';
  aviso.innerHTML = `Estás viendo tus cambios de prueba. No se ha publicado nada. <a href="${datos.admin}">Volver al panel</a>`;
  document.body.prepend(aviso);
}
