// El vídeo de la cabina como escena de cine: la sección es más alta que la
// pantalla y su interior se queda fijo mientras se baja. Con el scroll, el vídeo
// crece de tarjeta a pantalla completa (--e) y luego entra el texto (--t).
// Alrededor, un halo que sale del propio vídeo: se pinta a 24 × 42 píxeles en un
// canvas y el CSS lo difumina, así casi no cuesta nada.

const clamp = (n: number) => Math.min(1, Math.max(0, n));
const suave = (n: number) => n * n * (3 - 2 * n);

export function iniciarCine(seccion: HTMLElement) {
  const video = seccion.querySelector<HTMLVideoElement>('video');
  const ambiente = seccion.querySelector<HTMLCanvasElement>('[data-cine-ambiente]');
  const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let pendiente = false;
  const medir = () => {
    pendiente = false;
    const caja = seccion.getBoundingClientRect();
    const recorrido = Math.max(1, caja.height - window.innerHeight);
    const p = clamp(-caja.top / recorrido);
    // Hasta el 45 % del recorrido crece; del 35 % al 70 % entra el texto.
    const e = reducir ? 1 : suave(clamp(p / 0.45));
    const t = reducir ? 1 : suave(clamp((p - 0.35) / 0.35));
    seccion.style.setProperty('--e', e.toFixed(4));
    seccion.style.setProperty('--t', t.toFixed(4));
  };
  const pedir = () => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(medir);
  };
  window.addEventListener('scroll', pedir, { passive: true });
  window.addEventListener('resize', pedir);
  medir();

  if (!video || !ambiente) return;
  ambiente.width = 24;
  ambiente.height = 42;
  const c = ambiente.getContext('2d');
  if (!c) return;
  let marco = 0;
  const pintar = () => {
    marco = 0;
    if (video.paused || video.ended) return;
    if (video.readyState >= 2) c.drawImage(video, 0, 0, 24, 42);
    marco = requestAnimationFrame(pintar);
  };
  video.addEventListener('play', () => {
    if (!marco) marco = requestAnimationFrame(pintar);
  });
  // Con el vídeo parado, el halo sale del póster.
  if (video.poster) {
    const im = new Image();
    im.onload = () => c.drawImage(im, 0, 0, 24, 42);
    im.src = video.poster;
  }
}
