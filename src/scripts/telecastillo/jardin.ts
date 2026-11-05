// «¿Cabe en tu jardín?»: el visitante pone el largo y el ancho de su espacio (y si
// hay techo, árboles o cables a poca altura) y se ve qué hinchables caben, dejando
// 1 m libre alrededor para el anclaje y el motor. El plano dibuja a escala el
// jardín y el hinchable elegido. Los que se añaden a «tu fiesta» pasan al mensaje
// de reserva por WhatsApp.

export type Hinchable = {
  id: string;
  nombre: string;
  categoria: string;
  largo: number;
  ancho: number;
  alto: number | null;
  edad: string;
};

const MARGEN = 1;
const COLOR: Record<string, string> = { mini: '#ff8a1e', castillo: '#e5372b', agua: '#1e9bea', pista: '#7b5cff', juego: '#34c26b' };
const m = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 });

/** Cómo cabe: normal, girado o no cabe. */
export function encaje(h: Hinchable, largo: number, ancho: number, altoMax: number | null) {
  if (altoMax !== null && h.alto !== null && h.alto > altoMax) return { cabe: false, motivo: 'alto' as const, girado: false };
  const normal = h.largo + 2 * MARGEN <= largo && h.ancho + 2 * MARGEN <= ancho;
  const girado = h.ancho + 2 * MARGEN <= largo && h.largo + 2 * MARGEN <= ancho;
  if (normal || girado) return { cabe: true, motivo: null, girado: !normal };
  return { cabe: false, motivo: 'sitio' as const, girado: false };
}

export function iniciarJardin(raiz: HTMLElement, catalogo: Hinchable[]) {
  const $ = <T extends Element>(s: string) => raiz.querySelector<T>(s)!;
  const largoIn = $<HTMLInputElement>('[data-largo]');
  const anchoIn = $<HTMLInputElement>('[data-ancho]');
  const plano = $<SVGSVGElement>('[data-plano]');
  const resumen = $<HTMLElement>('[data-resumen]');
  const tarjetas = new Map([...raiz.querySelectorAll<HTMLElement>('[data-id]')].map((t) => [t.dataset.id!, t]));
  const porId = new Map(catalogo.map((h) => [h.id, h]));
  const lista = new Set<string>();
  let elegido: string | null = null;
  let elegidoAMano = false;

  const estado = () => {
    const altoSel = raiz.querySelector<HTMLInputElement>('input[name="alto"]:checked')?.value ?? 'libre';
    return {
      largo: Number(largoIn.value),
      ancho: Number(anchoIn.value),
      altoMax: altoSel === 'libre' ? null : Number(altoSel),
      tipo: raiz.querySelector<HTMLInputElement>('input[name="tipo"]:checked')?.value ?? 'todos',
    };
  };

  function dibujar(e: ReturnType<typeof estado>, h: Hinchable | undefined) {
    const { largo, ancho } = e;
    const pad = 1.6;
    // Si el hinchable no cabe, el plano se aleja para que se vean los dos enteros.
    let [x0, y0, x1, y1] = [0, 0, largo, ancho];
    if (h) {
      const g = encaje(h, largo, ancho, e.altoMax).girado;
      const [w, d] = g ? [h.ancho, h.largo] : [h.largo, h.ancho];
      x0 = Math.min(0, (largo - w) / 2);
      y0 = Math.min(0, (ancho - d) / 2);
      x1 = Math.max(largo, (largo + w) / 2);
      y1 = Math.max(ancho, (ancho + d) / 2);
    }
    plano.setAttribute('viewBox', `${x0 - pad} ${y0 - pad} ${x1 - x0 + pad * 2} ${y1 - y0 + pad * 2}`);
    const rejilla: string[] = [];
    for (let x = 1; x < largo; x++) rejilla.push(`M${x} 0V${ancho}`);
    for (let y = 1; y < ancho; y++) rejilla.push(`M0 ${y}H${largo}`);
    let pieza = '';
    let sobra = false;
    if (h) {
      const enc = encaje(h, largo, ancho, e.altoMax);
      const [w, d] = enc.girado ? [h.ancho, h.largo] : [h.largo, h.ancho];
      const x = (largo - w) / 2;
      const y = (ancho - d) / 2;
      const color = COLOR[h.categoria] ?? '#e5372b';
      const clase = enc.cabe ? 'pl-pieza' : 'pl-pieza no';
      sobra = w > largo || d > ancho;
      const fuente = Math.max(0.32, Math.min(0.7, Math.min(w, d) / 5, (Math.max(x1 - x0, y1 - y0) / 22) * 1.1));
      pieza = `<g class="${clase}">
        <rect x="${x}" y="${y}" width="${w}" height="${d}" rx="0.45" fill="${color}" />
        <rect x="${x + 0.25}" y="${y + 0.25}" width="${Math.max(0, w - 0.5)}" height="${Math.max(0, d - 0.5)}" rx="0.3" class="pl-costura" />
        <text x="${largo / 2}" y="${ancho / 2 - fuente * 0.2}" font-size="${fuente}" class="pl-nombre">${h.nombre.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>
        <text x="${largo / 2}" y="${ancho / 2 + fuente * 1.05}" font-size="${fuente * 0.8}" class="pl-medida">${m(w)} × ${m(d)} m${enc.cabe ? '' : enc.motivo === 'alto' ? ' · demasiado alto' : ' · no cabe'}</text>
      </g>`;
    }
    const f = Math.max(0.42, Math.min(0.8, Math.max(x1 - x0, y1 - y0) / 22));
    plano.innerHTML = `
      <defs>
        <pattern id="cesped" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="#5ccf7f"/><rect width="1" height="2" fill="#52c474"/></pattern>
      </defs>
      <rect x="0" y="0" width="${largo}" height="${ancho}" rx="0.5" fill="url(#cesped)" class="pl-jardin" />
      <path d="${rejilla.join('')}" class="pl-rejilla" />
      <rect x="${MARGEN}" y="${MARGEN}" width="${largo - 2 * MARGEN}" height="${ancho - 2 * MARGEN}" rx="0.3" class="pl-margen" />
      ${pieza}
      ${
        sobra
          ? `<text x="${largo / 2}" y="${ancho - 0.45}" font-size="${f * 0.75}" class="pl-cota pl-tuyo">tu jardín: ${m(largo)} × ${m(ancho)} m</text>`
          : `<text x="${largo / 2}" y="${-0.55}" font-size="${f}" class="pl-cota">${m(largo)} m</text>
      <text transform="translate(${-0.55} ${ancho / 2}) rotate(-90)" font-size="${f}" class="pl-cota">${m(ancho)} m</text>`
      }`;
  }

  function actualizar() {
    const e = estado();
    raiz.querySelector('[data-largo-n]')!.textContent = m(e.largo);
    raiz.querySelector('[data-ancho-n]')!.textContent = m(e.ancho);
    let caben = 0;
    let mayor: Hinchable | undefined;
    const ordenados = [...catalogo].sort((a, b) => b.largo * b.ancho - a.largo * a.ancho);
    ordenados.forEach((h, i) => {
      const t = tarjetas.get(h.id);
      if (!t) return;
      const enc = encaje(h, e.largo, e.ancho, e.altoMax);
      const visible = e.tipo === 'todos' || h.categoria === e.tipo;
      t.hidden = !visible;
      t.classList.toggle('cabe', enc.cabe);
      t.classList.toggle('no-cabe', !enc.cabe);
      t.style.order = String((enc.cabe ? 0 : 1000) + i);
      const etiqueta = t.querySelector<HTMLElement>('[data-encaje]')!;
      etiqueta.textContent = enc.cabe ? (enc.girado ? 'Cabe girado' : 'Cabe') : enc.motivo === 'alto' ? 'Muy alto' : 'No cabe';
      if (visible && enc.cabe) {
        caben++;
        if (!mayor) mayor = h;
      }
    });
    const total = catalogo.filter((h) => e.tipo === 'todos' || h.categoria === e.tipo).length;
    if (!elegidoAMano || !elegido) elegido = mayor?.id ?? null;
    const h = elegido ? porId.get(elegido) : undefined;
    tarjetas.forEach((t, id) => t.classList.toggle('elegido', id === elegido));
    resumen.innerHTML = caben
      ? `En <b>${m(e.largo)} × ${m(e.ancho)} m</b> caben <b>${caben} de ${total}</b>.${mayor ? ` El más grande: <b>${mayor.nombre}</b>.` : ''}`
      : `En <b>${m(e.largo)} × ${m(e.ancho)} m</b> no cabe ninguno de estos con 1 m libre alrededor. Escríbenos: a veces hay solución.`;
    dibujar(e, h);
    raiz.dispatchEvent(new CustomEvent('tc-jardin', { bubbles: true, detail: { largo: e.largo, ancho: e.ancho } }));
  }

  function avisarLista() {
    const nombres = [...lista].map((id) => porId.get(id)?.nombre ?? id);
    raiz.querySelectorAll('[data-lista-n]').forEach((el) => (el.textContent = String(lista.size)));
    raiz.querySelector<HTMLElement>('[data-lista]')?.toggleAttribute('hidden', lista.size === 0);
    raiz.querySelector('[data-lista-nombres]')!.textContent = nombres.join(', ');
    document.dispatchEvent(new CustomEvent('tc-lista', { detail: { nombres } }));
  }

  for (const [id, t] of tarjetas) {
    t.querySelector('[data-ver]')?.addEventListener('click', () => {
      elegido = id;
      elegidoAMano = true;
      actualizar();
      if (matchMedia('(max-width: 900px)').matches) plano.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    const anadir = t.querySelector<HTMLButtonElement>('[data-anadir]')!;
    anadir.addEventListener('click', () => {
      if (lista.has(id)) lista.delete(id);
      else lista.add(id);
      const dentro = lista.has(id);
      anadir.setAttribute('aria-pressed', String(dentro));
      anadir.querySelector('span')!.textContent = dentro ? 'En tu fiesta' : 'Añadir';
      t.classList.toggle('en-lista', dentro);
      avisarLista();
    });
  }
  raiz.addEventListener('input', actualizar);
  raiz.addEventListener('change', (ev) => {
    if ((ev.target as HTMLInputElement).name === 'tipo') elegidoAMano = false;
    actualizar();
  });
  actualizar();
  avisarLista();
}
