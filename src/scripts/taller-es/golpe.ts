// «Señala dónde ha sido»: marcar piezas en el dibujo del coche, elegir qué le ha
// pasado y si va por el seguro, y abrir WhatsApp con el mensaje ya escrito. Nada
// pasa por ningún servidor: el mensaje se compone aquí y lo envía la persona.

const minuscula = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function lista(nombres: string[]) {
  if (nombres.length < 2) return nombres.join('');
  return `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`;
}

export function iniciarGolpe(form: HTMLFormElement, negocio: string) {
  const zonas = [...form.querySelectorAll<SVGElement>('[data-zona]')];
  const elegidas: string[] = [];
  const caja = form.querySelector<HTMLElement>('[data-zonas]')!;
  const vista = form.querySelector<HTMLElement>('[data-mensaje]')!;
  const aviso = form.querySelector<HTMLElement>('[data-aviso]')!;
  const etiqueta = form.querySelector<HTMLElement>('[data-etiqueta]')!;
  const contador = form.querySelector<HTMLElement>('[data-cuenta]')!;
  const resumen = form.querySelector<HTMLElement>('[data-marcadas]');
  const nombreDe = (id: string) => zonas.find((z) => z.dataset.zona === id)?.dataset.nombre ?? id;

  function alternar(id: string) {
    const i = elegidas.indexOf(id);
    if (i >= 0) elegidas.splice(i, 1);
    else elegidas.push(id);
    zonas.forEach((z) => {
      const marcada = elegidas.includes(z.dataset.zona!);
      z.setAttribute('aria-checked', String(marcada));
      z.classList.toggle('marcada', marcada);
    });
    pintarLista();
    actualizar();
  }

  function pintarLista() {
    caja.replaceChildren();
    contador.textContent = elegidas.length ? `${elegidas.length} ${elegidas.length === 1 ? 'pieza' : 'piezas'}` : '';
    if (resumen) {
      resumen.innerHTML = elegidas.length ? '<b></b>' : 'Toca las piezas con daños';
      if (elegidas.length) resumen.querySelector('b')!.textContent = lista(elegidas.map((id) => minuscula(nombreDe(id))));
    }
    if (!elegidas.length) {
      const vacio = document.createElement('li');
      vacio.className = 'ps-vacio';
      vacio.textContent = 'Toca en el dibujo las piezas con daños.';
      caja.append(vacio);
      return;
    }
    for (const id of elegidas) {
      const li = document.createElement('li');
      const quitar = document.createElement('button');
      quitar.type = 'button';
      quitar.className = 'ps-pieza';
      quitar.innerHTML = `<span></span><b aria-hidden="true">×</b>`;
      quitar.querySelector('span')!.textContent = nombreDe(id);
      quitar.setAttribute('aria-label', `Quitar ${nombreDe(id)}`);
      quitar.addEventListener('click', () => alternar(id));
      li.append(quitar);
      caja.append(li);
    }
  }

  function mensaje() {
    const datos = new FormData(form);
    const piezas = elegidas.map((id) => minuscula(nombreDe(id)));
    if (datos.get('nose')) piezas.push('no sé decir qué pieza es');
    const dano = String(datos.get('dano') ?? '');
    const seguro = String(datos.get('seguro') ?? '');
    const coche = String(datos.get('coche') ?? '').trim();
    const nombre = String(datos.get('nombre') ?? '').trim();
    const lineas = [`Hola, vengo de la web de ${negocio}. Quería un presupuesto:`];
    lineas.push(`• Dónde: ${piezas.length ? lista(piezas) : '(sin marcar)'}`);
    if (dano) lineas.push(`• Qué ha pasado: ${minuscula(dano)}`);
    if (seguro) lineas.push(`• Seguro: ${seguro === 'Sí' ? 'sí, va por el seguro' : seguro === 'No' ? 'no, lo pago yo' : 'no lo sé todavía'}`);
    if (coche) lineas.push(`• Coche: ${coche}`);
    lineas.push('');
    lineas.push(`${nombre ? `Soy ${nombre}. ` : ''}Ahora os mando las fotos.`);
    return { texto: lineas.join('\n'), completo: piezas.length > 0 };
  }

  function actualizar() {
    vista.textContent = mensaje().texto;
    if (!aviso.hidden && mensaje().completo) aviso.hidden = true;
  }

  for (const z of zonas) {
    z.addEventListener('click', () => alternar(z.dataset.zona!));
    z.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        alternar(z.dataset.zona!);
      }
    });
    // Nombre de la pieza junto al dedo o el ratón, para saber qué se va a marcar.
    const mostrar = () => {
      const zona = z.getBoundingClientRect();
      const marco = etiqueta.parentElement!.getBoundingClientRect();
      etiqueta.textContent = z.dataset.nombre!;
      etiqueta.style.transform = `translate(${Math.round(zona.left + zona.width / 2 - marco.left)}px, ${Math.round(zona.top - marco.top - 8)}px) translate(-50%, -100%)`;
      etiqueta.hidden = false;
    };
    z.addEventListener('pointerenter', mostrar);
    z.addEventListener('focus', mostrar);
    z.addEventListener('pointerleave', () => (etiqueta.hidden = true));
    z.addEventListener('blur', () => (etiqueta.hidden = true));
  }

  form.addEventListener('input', actualizar);
  form.addEventListener('change', actualizar);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const { texto, completo } = mensaje();
    if (!completo) {
      aviso.textContent = 'Marca al menos una pieza en el dibujo, o «No sé qué pieza es».';
      aviso.hidden = false;
      aviso.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    const wa = form.dataset.wa;
    if (wa) window.open(`${wa}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
    else if (form.dataset.tel) location.href = form.dataset.tel;
  });

  pintarLista();
  actualizar();
}
