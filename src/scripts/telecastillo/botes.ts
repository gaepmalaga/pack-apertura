// «¡A botar!»: cada letra es un trozo de hinchable. Al cargar caen desde arriba y
// rebotan contra el suelo, se aplastan al tocarlo y tiemblan como la lona. Si las
// tocas o pasas el ratón, saltan, y la de al lado salta un poco después (la ola).
// De vez en cuando, si nadie las toca, alguna da un saltito sola.

type Letra = { el: HTMLElement; y: number; v: number; aplasta: number; va: number; espera: number };

const GRAVEDAD = 3200;
const REBOTE = 0.46;

export function iniciarBotes(raiz: HTMLElement) {
  const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const letras: Letra[] = [...raiz.querySelectorAll<HTMLElement>('[data-letra]')].map((el, i) => ({
    el,
    y: reducir ? 0 : -(window.innerHeight * 0.7 + Math.random() * 260),
    v: 0,
    aplasta: 0,
    va: 0,
    espera: reducir ? 0 : 0.15 + i * 0.07,
  }));
  if (!letras.length) return;

  let marco = 0;
  let ultimo = performance.now();
  let tocado = false;

  const pintar = (l: Letra) => {
    const sx = 1 + l.aplasta * 0.55;
    const sy = 1 - l.aplasta;
    l.el.style.transform = `translate3d(0, ${l.y.toFixed(1)}px, 0) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
  };

  function paso(ahora: number) {
    const dt = Math.min(0.033, (ahora - ultimo) / 1000);
    ultimo = ahora;
    let quietas = 0;
    for (const l of letras) {
      if (l.espera > 0) {
        l.espera -= dt;
        pintar(l);
        continue;
      }
      l.v += GRAVEDAD * dt;
      l.y += l.v * dt;
      if (l.y >= 0) {
        // Toca la lona: rebota y se aplasta según lo fuerte que llega.
        if (l.v > 140) {
          l.aplasta = Math.min(0.38, l.v / 3600);
          l.va = 0;
          l.v = -l.v * REBOTE;
        } else l.v = 0;
        l.y = 0;
      }
      // El aplastamiento vuelve con un muelle amortiguado: tiembla un poco.
      l.va += (-460 * l.aplasta - 15 * l.va) * dt;
      l.aplasta += l.va * dt;
      pintar(l);
      if (l.y === 0 && l.v === 0 && Math.abs(l.aplasta) < 0.002 && Math.abs(l.va) < 0.02) quietas++;
    }
    marco = quietas === letras.length ? 0 : requestAnimationFrame(paso);
  }
  const arrancar = () => {
    if (!marco) {
      ultimo = performance.now();
      marco = requestAnimationFrame(paso);
    }
  };

  /** Salto de una letra y, un poco después, de sus vecinas. */
  function saltar(i: number, fuerza = 1150) {
    const l = letras[i];
    if (!l || l.y < -4) return;
    l.v = -fuerza;
    l.aplasta = -0.12;
    arrancar();
    [-1, 1].forEach((d) => {
      const vecina = letras[i + d];
      if (vecina) setTimeout(() => vecina.y >= -2 && ((vecina.v = -fuerza * 0.55), arrancar()), 90);
    });
  }

  letras.forEach((l, i) => {
    l.el.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse') {
        tocado = true;
        saltar(i, 820);
      }
    });
    l.el.addEventListener('pointerdown', () => {
      tocado = true;
      saltar(i);
    });
  });

  // Vida propia: cada pocos segundos, si nadie toca, una letra da un saltito.
  if (!reducir) {
    setInterval(() => {
      if (tocado || document.hidden) return;
      const caja = raiz.getBoundingClientRect();
      if (caja.bottom < 0 || caja.top > window.innerHeight) return;
      saltar(Math.floor(Math.random() * letras.length), 620);
    }, 3800);
  }

  letras.forEach(pintar);
  raiz.classList.add('listo');
  if (!reducir) arrancar();
}
