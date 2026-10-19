// Reserva sin servidor ni API de pago, y sin los selectores del sistema (el
// desplegable y el calendario de Android rompen el diseño): días y horas son
// botones generados con el horario del local. Al enviar se abre WhatsApp con el
// mensaje ya escrito; si el negocio no tiene WhatsApp, lleva al teléfono.
import { porDia, aMinutos, ahoraEnMadrid, type Dia } from '../lib/horario';

type Tramo = { dia: Dia; abre: string; cierra: string };
const DIA_JS: Dia[] = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const hh = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/** Horas de reserva de un día: cada media hora, hasta una hora antes de cerrar. */
function horasDe(semana: ReturnType<typeof porDia>, dia: Dia, desde = 0) {
  const tramos = semana[dia];
  const lista: string[] = [];
  const fuente = tramos.length ? tramos : [{ abre: '13:00', cierra: '23:00' }];
  for (const t of fuente) {
    const a = aMinutos(t.abre);
    let c = aMinutos(t.cierra);
    if (c <= a) c += 1440;
    for (let m = Math.ceil(a / 30) * 30; m <= c - 60; m += 30) if (m >= desde) lista.push(hh(m));
  }
  return lista;
}

function boton(texto: string, valor: string, nombre: string, sub = '', clase = '') {
  const label = document.createElement('label');
  label.className = `chip ${clase}`.trim();
  label.innerHTML = `<input type="radio" name="${nombre}" value="${valor}"><span>${texto}${sub ? `<small>${sub}</small>` : ''}</span>`;
  return label;
}

export function iniciarReserva(negocio: string, horario: Tramo[]) {
  const form = document.querySelector<HTMLFormElement>('[data-reserva]');
  if (!form) return;
  const semana = porDia(horario);
  const conHorario = horario.length > 0;
  const dias = form.querySelector<HTMLElement>('[data-dias-reserva]')!;
  const horas = form.querySelector<HTMLElement>('[data-horas-reserva]')!;
  const aviso = form.querySelector<HTMLElement>('[data-aviso-reserva]')!;

  // Próximos 14 días, saltando los que el local cierra.
  const hoy = new Date();
  const { dia: diaHoy, minuto } = ahoraEnMadrid();
  dias.replaceChildren();
  for (let i = 0; i < 14; i++) {
    const f = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i);
    const dia = i === 0 ? diaHoy : DIA_JS[f.getDay()];
    if (conHorario && !semana[dia].length) continue;
    if (i === 0 && !horasDe(semana, dia, minuto + 30).length) continue;
    const iso = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
    const nombre = i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : f.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');
    dias.append(boton(nombre, `${iso}|${dia}|${i}`, 'dia', f.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', ''), 'dia'));
  }

  dias.addEventListener('change', () => {
    const [, dia, i] = (new FormData(form).get('dia') as string).split('|');
    const lista = horasDe(semana, dia as Dia, i === '0' ? minuto + 30 : 0);
    horas.replaceChildren(...lista.map((h) => boton(h, h, 'hora')));
    horas.closest('[data-paso-hora]')!.removeAttribute('hidden');
  });

  const personas = form.querySelector<HTMLOutputElement>('[data-personas]');
  form.querySelectorAll<HTMLButtonElement>('[data-mas],[data-menos]').forEach((b) =>
    b.addEventListener('click', () => {
      const v = Math.min(40, Math.max(1, Number(personas!.value) + (b.hasAttribute('data-mas') ? 1 : -1)));
      personas!.value = String(v);
    }),
  );

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const datos = new FormData(form);
    const v = (k: string) => String(datos.get(k) ?? '').trim();
    if (!v('dia') || !v('hora')) {
      aviso.textContent = !v('dia') ? 'Elige el día.' : 'Elige la hora.';
      aviso.hidden = false;
      return;
    }
    aviso.hidden = true;
    const [iso] = v('dia').split('|');
    const fecha = new Date(`${iso}T12:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    const lineas = [
      `Hola, quería reservar en ${negocio}.`,
      v('opcion') && `Para: ${v('opcion')}`,
      `Día: ${fecha}`,
      `Hora: ${v('hora')}`,
      personas && `Personas: ${personas.value}`,
      v('nombre') && `A nombre de: ${v('nombre')}`,
      v('nota') && `Nota: ${v('nota')}`,
    ].filter(Boolean);
    const wa = form.dataset.wa;
    const destino = wa ? `${wa}?text=${encodeURIComponent(lineas.join('\n'))}` : form.dataset.tel;
    if (destino) window.location.href = destino;
  });
}

