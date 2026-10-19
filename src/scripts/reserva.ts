// Reserva sin servidor ni API de pago: el formulario monta el mensaje y abre
// WhatsApp con él escrito. Si el negocio no tiene WhatsApp, lleva al teléfono.
export function iniciarReserva(negocio: string) {
  const form = document.querySelector<HTMLFormElement>('[data-reserva]');
  if (!form) return;
  const dia = form.querySelector<HTMLInputElement>('#r-dia');
  if (dia) {
    const hoy = new Date();
    dia.min = new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  }
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const datos = new FormData(form);
    const v = (k: string) => String(datos.get(k) ?? '').trim();
    const fecha = v('dia') ? new Date(`${v('dia')}T12:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
    const lineas = [
      `Hola, quería reservar en ${negocio}.`,
      v('opcion') && `Para: ${v('opcion')}`,
      fecha && `Día: ${fecha}`,
      v('hora') && `Hora: ${v('hora')}`,
      v('personas') && `Personas: ${v('personas')}`,
      v('nombre') && `A nombre de: ${v('nombre')}`,
      v('nota') && `Nota: ${v('nota')}`,
    ].filter(Boolean);
    const wa = form.dataset.wa;
    const destino = wa ? `${wa}?text=${encodeURIComponent(lineas.join('\n'))}` : form.dataset.tel;
    if (destino) window.location.href = destino;
  });
}
