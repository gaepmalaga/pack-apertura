// «Un golpe se arregla por capas»: corte de una chapa abollada que, al bajar con
// el scroll, se endereza, se enmasilla y recibe aparejo, color y barniz, hasta
// pulirse. Las capas de pintura guardan su grosor real entre ellas (1 µm = 0,45 px);
// la chapa no cabe a esa escala y va cortada.
// La geometría no toca el DOM: la usa Astro al compilar (estado final) y el
// navegador para animar.

export const BASE = 250;
const X0 = 24;
const X1 = 616;
const MICRAS = { aparejo: 60, color: 20, barniz: 50 };
const PX = 0.45;
const ABOLLADO = 34;
const RESTO = 6;

const r1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));

/** Línea de rotura de la chapa (va cortada por abajo). */
function rotura(y: number) {
  const puntos: string[] = [];
  for (let x = X1, i = 0; x >= X0; x -= 16, i++) puntos.push(`${x} ${y + (i % 2 ? 5 : -1)}`);
  return `L${puntos.join('L')}`;
}

export function chapa(hundido: number) {
  const y = BASE + hundido;
  return `M${X0} ${BASE}H185C245 ${BASE} 265 ${r1(y)} 320 ${r1(y)}S395 ${BASE} 455 ${BASE}H${X1}V292${rotura(296)}Z`;
}

export const pinturaVieja = [
  `M${X0} ${BASE}V238H196L203 242 198 246 206 ${BASE}Z`,
  `M${X1} ${BASE}V238H444L437 242 442 246 434 ${BASE}Z`,
];

export const masilla = `M185 ${BASE}C245 ${BASE} 265 ${BASE + RESTO} 320 ${BASE + RESTO}S395 ${BASE} 455 ${BASE}Z`;
export const masillaSobrante = `M196 ${BASE}C250 238 390 238 444 ${BASE}Z`;

const grosorAparejo = MICRAS.aparejo * PX;
const grosorColor = MICRAS.color * PX;
const grosorBarniz = MICRAS.barniz * PX;

/** Arriba del aparejo: solo en la zona de la reparación, difuminado en los bordes. */
const arribaAparejo = (x: number) => BASE - grosorAparejo * Math.min(clamp((x - 120) / 40), clamp((520 - x) / 40));
/** Arriba del color: cubre casi toda la pieza y se difumina en los extremos. */
const arribaColor = (x: number) => arribaAparejo(x) - grosorColor * Math.min(clamp((x - 50) / 30), clamp((590 - x) / 30));
const ola = (x: number) => Math.sin(x * 0.21) * 0.6 + Math.sin(x * 0.47 + 1.3) * 0.3 + Math.sin(x * 0.93 + 2.1) * 0.15;
const olaPendiente = (x: number) => 0.126 * Math.cos(x * 0.21) + 0.141 * Math.cos(x * 0.47 + 1.3) + 0.14 * Math.cos(x * 0.93 + 2.1);
/** Arriba del barniz, con piel de naranja según lo que falte por pulir (0–1). */
const arribaBarniz = (x: number, piel: number) => arribaColor(x) - grosorBarniz + ola(x) * 2.4 * piel;

function franja(desde: number, hasta: number, arriba: (x: number) => number, abajo: (x: number) => number, paso = 5) {
  const xs: number[] = [];
  for (let x = desde; x < hasta; x += paso) xs.push(x);
  xs.push(hasta);
  const sube = xs.map((x) => `${x} ${r1(arriba(x))}`).join('L');
  const baja = [...xs].reverse().map((x) => `${x} ${r1(abajo(x))}`).join('L');
  return `M${sube}L${baja}Z`;
}

export const aparejo = `M120 ${BASE}L160 ${r1(BASE - grosorAparejo)}H480L520 ${BASE}Z`;
export const color = franja(50, 590, arribaColor, arribaAparejo);
export const barniz = (piel: number) => franja(X0, X1, (x) => arribaBarniz(x, piel), arribaColor, 4);

/** Rayos de luz que llegan en paralelo y rebotan en el barniz: con piel de naranja
 *  salen cada uno por su lado; pulido, salen todos paralelos (eso es el reflejo nítido). */
export function rayos(piel: number) {
  const entrada = { x: 0.42, y: 0.91 };
  return [236, 278, 320, 362, 404]
    .map((x) => {
      const y = arribaBarniz(x, piel);
      const pendiente = olaPendiente(x) * 2.4 * piel * 0.35;
      const largo = Math.hypot(pendiente, 1);
      const n = { x: pendiente / largo, y: -1 / largo };
      const punto = entrada.x * n.x + entrada.y * n.y;
      const sale = { x: entrada.x - 2 * punto * n.x, y: entrada.y - 2 * punto * n.y };
      return `M${r1(x - entrada.x * 150)} ${r1(y - entrada.y * 150)}L${x} ${r1(y)}L${r1(x + sale.x * 150)} ${r1(y + sale.y * 150)}`;
    })
    .join('');
}

/** Micras de pintura sobre la chapa según lo que se ha aplicado de cada capa. */
export const micras = (a: { aparejo: number; color: number; barniz: number; pulido: number }) =>
  MICRAS.aparejo * a.aparejo + MICRAS.color * a.color + MICRAS.barniz * a.barniz - 3 * a.pulido;

const NOTAS = [
  'Pintura rota y chapa hundida',
  'Chapa en su sitio, lijada hasta el metal',
  'La masilla no suma: solo rellena el golpe',
  'Aparejo: unas 60 micras',
  'Color: unas 20 micras más',
  'Barniz: unas 50 micras más. Un folio, más o menos',
  'El pulido se lleva unas pocas micras de barniz',
];

export function iniciarCapas(seccion: HTMLElement) {
  const $ = <T extends Element>(s: string) => seccion.querySelector<T>(s)!;
  const pasos = [...seccion.querySelectorAll<HTMLElement>('[data-paso]')];
  const capas = [...seccion.querySelectorAll<HTMLElement>('[data-capa]')];
  const n = pasos.length;
  const el = {
    chapa: $<SVGPathElement>('[data-d="chapa"]'),
    vieja: $<SVGGElement>('[data-d="vieja"]'),
    masilla: $<SVGGElement>('[data-d="masilla"]'),
    sobrante: $<SVGPathElement>('[data-d="sobrante"]'),
    aparejo: $<SVGRectElement>('[data-recorte="aparejo"]'),
    color: $<SVGRectElement>('[data-recorte="color"]'),
    barnizRecorte: $<SVGRectElement>('[data-recorte="barniz"]'),
    barniz: $<SVGPathElement>('[data-d="barniz"]'),
    rayos: $<SVGPathElement>('[data-d="rayos"]'),
    tubo: $<SVGGElement>('[data-d="tubo"]'),
    pistola: $<SVGGElement>('[data-d="pistola"]'),
    niebla: $<SVGPathElement>('[data-d="niebla"]'),
    taco: $<SVGGElement>('[data-d="taco"]'),
    micras: $<HTMLElement>('[data-micras]'),
    nota: $<HTMLElement>('[data-micras-nota]'),
    paso: $<HTMLElement>('[data-paso-n]'),
    barra: $<HTMLElement>('[data-capas-barra]'),
  };
  const nieblas = ['var(--c-aparejo)', 'var(--c-color)', 'var(--c-barniz)'];
  let activo = -1;
  let pielAnterior = -1;

  function pintar() {
    const caja = seccion.getBoundingClientRect();
    const recorrido = Math.max(1, caja.height - window.innerHeight);
    const p = clamp(-caja.top / recorrido);
    const s = p * n;
    // Cada paso se anima en el primer 70 % de su tramo y luego se queda quieto.
    const a = (k: number) => clamp((s - k) / 0.7);
    const [aChapa, aMasilla, aAparejo, aColor, aBarniz, aPulido] = [1, 2, 3, 4, 5, 6].map(a);

    el.chapa.setAttribute('d', chapa(ABOLLADO - (ABOLLADO - RESTO) * aChapa));
    el.vieja.style.opacity = String(1 - aChapa);
    el.masilla.style.opacity = String(clamp(aMasilla * 3));
    const sobrante = aMasilla < 0.5 ? aMasilla * 2 : 1 - (aMasilla - 0.5) * 2;
    el.sobrante.style.transform = `scaleY(${clamp(sobrante)})`;
    const recorte = (r: SVGRectElement, v: number) => r.setAttribute('width', String(r1((X1 - X0 + 20) * v)));
    recorte(el.aparejo, aAparejo);
    recorte(el.color, aColor);
    recorte(el.barnizRecorte, aBarniz);

    const piel = 1 - aPulido;
    if (Math.abs(piel - pielAnterior) > 0.002) {
      el.barniz.setAttribute('d', barniz(piel));
      el.rayos.setAttribute('d', rayos(piel));
      pielAnterior = piel;
    }
    const luz = clamp((s - 5.35) * 3);
    el.rayos.style.opacity = String(luz);
    el.tubo.style.opacity = String(luz);

    // Pistola sobre la capa que se está echando; taco de lija sobre la masilla.
    const pintando = [aAparejo, aColor, aBarniz].findIndex((v) => v > 0 && v < 1);
    if (pintando >= 0) {
      const v = [aAparejo, aColor, aBarniz][pintando];
      el.pistola.style.opacity = '1';
      el.pistola.setAttribute('transform', `translate(${r1(X0 + (X1 - X0) * v)} 112)`);
      el.niebla.style.fill = nieblas[pintando];
    } else el.pistola.style.opacity = '0';
    const lijando = aMasilla > 0.4 && aMasilla < 0.99;
    el.taco.style.opacity = lijando ? '1' : '0';
    if (lijando) el.taco.setAttribute('transform', `translate(${r1(320 + 96 * Math.sin(aMasilla * Math.PI * 7))} 250)`);

    const valor = micras({ aparejo: aAparejo, color: aColor, barniz: aBarniz, pulido: aPulido });
    el.micras.textContent = String(Math.round(valor));
    el.barra.style.transform = `scaleX(${p})`;

    const ahora = Math.min(n - 1, Math.floor(s));
    if (ahora !== activo) {
      activo = ahora;
      pasos.forEach((paso, i) => paso.classList.toggle('activo', i === ahora));
      el.nota.textContent = NOTAS[ahora] ?? '';
      el.paso.textContent = `${ahora + 1} / ${n}`;
    }
    const puestas = { chapa: 1, masilla: aMasilla, aparejo: aAparejo, color: aColor, barniz: aBarniz } as Record<string, number>;
    capas.forEach((c) => c.classList.toggle('puesta', (puestas[c.dataset.capa!] ?? 0) > 0.05));
  }

  let pendiente = false;
  const pedir = () => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => {
      pendiente = false;
      pintar();
    });
  };
  window.addEventListener('scroll', pedir, { passive: true });
  window.addEventListener('resize', pedir);
  pintar();
}
