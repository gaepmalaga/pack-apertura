// Reserva por WhatsApp: fecha, pueblo, tipo de fiesta y niños, más los hinchables
// añadidos en «¿Cabe en tu jardín?» y las medidas del sitio. Se compone el mensaje
// aquí, se ve tal como llegará y se abre WhatsApp: nada pasa por ningún servidor.

export function iniciarReserva(form: HTMLFormElement, negocio: string) {
  const vista = form.querySelector<HTMLElement>('[data-mensaje]')!;
  const aviso = form.querySelector<HTMLElement>('[data-aviso]')!;
  const fecha = form.querySelector<HTMLInputElement>('input[name="fecha"]')!;
  let hinchables: string[] = [];
  let jardin: { largo: number; ancho: number } | null = null;
  let jardinTocado = false;

  // La fecha mínima es hoy (en el móvil, el calendario no deja elegir días pasados).
  const hoy = new Date();
  fecha.min = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

  const bonita = (iso: string) => {
    if (!iso) return '';
    const [a, mes, d] = iso.split('-').map(Number);
    return new Date(a, mes - 1, d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  function mensaje() {
    const d = new FormData(form);
    const lineas = [`Hola ${negocio}, vengo de vuestra web. Quería reservar:`];
    const f = bonita(String(d.get('fecha') ?? ''));
    lineas.push(`• Fecha: ${f || '(por decidir)'}`);
    const sitio = String(d.get('pueblo') ?? '');
    if (sitio) lineas.push(`• Dónde: ${sitio}`);
    const evento = String(d.get('evento') ?? '');
    if (evento) lineas.push(`• Fiesta: ${evento.toLowerCase()}`);
    const ninos = String(d.get('ninos') ?? '');
    if (ninos) lineas.push(`• Niños: ${ninos}`);
    if (hinchables.length) lineas.push(`• Hinchables: ${hinchables.join(', ')}`);
    if (jardin && jardinTocado) lineas.push(`• Espacio: unos ${jardin.largo} × ${jardin.ancho} m`);
    const nombre = String(d.get('nombre') ?? '').trim();
    lineas.push('');
    lineas.push(`${nombre ? `Soy ${nombre}. ` : ''}¿Tenéis disponibilidad?`);
    return { texto: lineas.join('\n'), completo: !!f && !!sitio };
  }

  const actualizar = () => {
    vista.textContent = mensaje().texto;
    if (!aviso.hidden && mensaje().completo) aviso.hidden = true;
  };

  document.addEventListener('tc-lista', (e) => {
    hinchables = (e as CustomEvent<{ nombres: string[] }>).detail.nombres;
    const caja = form.querySelector<HTMLElement>('[data-elegidos]');
    if (caja) {
      caja.textContent = hinchables.length ? hinchables.join(' · ') : 'Ninguno todavía: puedes añadirlos arriba, en «¿Cabe en tu jardín?», o decidirlo con nosotros.';
      caja.classList.toggle('vacio', !hinchables.length);
    }
    actualizar();
  });
  document.addEventListener('tc-jardin', (e) => {
    const nuevo = (e as CustomEvent<{ largo: number; ancho: number }>).detail;
    if (jardin && (jardin.largo !== nuevo.largo || jardin.ancho !== nuevo.ancho)) jardinTocado = true;
    jardin = nuevo;
    actualizar();
  });

  form.addEventListener('input', actualizar);
  form.addEventListener('change', actualizar);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const { texto, completo } = mensaje();
    if (!completo) {
      aviso.textContent = 'Pon al menos la fecha y el pueblo para saber si tenemos hueco.';
      aviso.hidden = false;
      return;
    }
    const wa = form.dataset.wa;
    if (wa) window.open(`${wa}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
    else if (form.dataset.tel) location.href = form.dataset.tel;
  });
  actualizar();
}
