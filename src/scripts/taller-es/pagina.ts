// Detalles de la página de Taller.Es que no son de ninguna sección en concreto:
// la cabecera que se oscurece al bajar, los textos que aparecen al llegar a
// ellos, los números de la foto de la cabina y la pulidora que sigue al ratón.

const reducir = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function cabecera() {
  const cab = document.querySelector<HTMLElement>('[data-cabecera]');
  if (!cab) return;
  const mirar = () => cab.classList.toggle('solida', window.scrollY > 24);
  window.addEventListener('scroll', mirar, { passive: true });
  mirar();
}

function revelar() {
  const elementos = document.querySelectorAll<HTMLElement>('[data-revelar]');
  if (reducir() || !('IntersectionObserver' in window)) {
    elementos.forEach((el) => el.classList.add('visto'));
    return;
  }
  const obs = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('visto');
        obs.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
  );
  elementos.forEach((el) => obs.observe(el));
}

function cabina() {
  const seccion = document.querySelector<HTMLElement>('[data-cabina]');
  if (!seccion) return;
  const botones = [...seccion.querySelectorAll<HTMLButtonElement>('[data-punto-boton]')];
  const items = [...seccion.querySelectorAll<HTMLElement>('[data-punto]')];
  // Siempre hay un punto abierto: el que se ha tocado o, al pasar el ratón, el de debajo.
  let fijo = '1';
  const marcar = (n: string) => {
    botones.forEach((b) => {
      const activo = b.dataset.puntoBoton === n;
      b.classList.toggle('activo', activo);
      if (b.hasAttribute('aria-expanded')) b.setAttribute('aria-expanded', String(activo));
      else b.setAttribute('aria-pressed', String(activo));
    });
    items.forEach((li) => li.classList.toggle('activo', li.dataset.punto === n));
  };
  for (const b of botones) {
    const n = b.dataset.puntoBoton!;
    b.addEventListener('pointerenter', () => marcar(n));
    b.addEventListener('focus', () => marcar(n));
    b.addEventListener('pointerleave', () => marcar(fijo));
    b.addEventListener('click', () => {
      fijo = n;
      marcar(n);
      // En el móvil la lista va debajo de la foto: al tocar un número, se ve su texto.
      if (b.classList.contains('cb-marca') && matchMedia('(max-width: 1080px)').matches) {
        items.find((li) => li.dataset.punto === n)?.scrollIntoView({ block: 'nearest', behavior: reducir() ? 'auto' : 'smooth' });
      }
    });
  }
}

/** Disco de pulidora que sigue al ratón por la portada (solo con ratón). */
function pulidora() {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  const disco = hero?.querySelector<HTMLElement>('[data-pulidora]');
  if (!hero || !disco || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  let x = 0;
  let y = 0;
  let ax = 0;
  let ay = 0;
  let giro = 0;
  let marco = 0;
  const mover = () => {
    marco = 0;
    const dx = x - ax;
    const dy = y - ay;
    ax += dx * 0.35;
    ay += dy * 0.35;
    giro += Math.min(40, Math.hypot(dx, dy) * 0.9);
    disco.style.transform = `translate(${ax}px, ${ay}px)`;
    disco.style.setProperty('--giro', `${giro}deg`);
    if (Math.abs(dx) + Math.abs(dy) > 0.3) marco = requestAnimationFrame(mover);
  };
  hero.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const caja = hero.getBoundingClientRect();
    x = e.clientX - caja.left;
    y = e.clientY - caja.top;
    const sobreBoton = !!(e.target as Element).closest('a, button');
    disco.classList.toggle('oculta', sobreBoton);
    hero.classList.toggle('puliendo', !sobreBoton);
    if (!disco.classList.contains('vista')) {
      ax = x;
      ay = y;
      disco.classList.add('vista');
    }
    if (!marco) marco = requestAnimationFrame(mover);
  });
  hero.addEventListener('pointerleave', () => {
    disco.classList.remove('vista');
    hero.classList.remove('puliendo');
  });
}

/** El vídeo de la cabina: suena solo (sin sonido) cuando se ve, se para al salir
 *  y se puede pausar. Con «reducir movimiento» no arranca solo. */
function video() {
  const v = document.querySelector<HTMLVideoElement>('[data-video]');
  const boton = document.querySelector<HTMLButtonElement>('[data-video-boton]');
  if (!v || !boton) return;
  const marco = v.closest('figure')!;
  let pausadoAMano = reducir();
  const pintar = () => {
    const sonando = !v.paused;
    marco.classList.toggle('sonando', sonando);
    boton.setAttribute('aria-label', sonando ? 'Pausar el vídeo' : 'Reproducir el vídeo');
  };
  v.addEventListener('play', pintar);
  v.addEventListener('pause', pintar);
  const reproducir = () => v.play().catch(() => pintar());
  boton.addEventListener('click', () => {
    if (v.paused) {
      pausadoAMano = false;
      reproducir();
    } else {
      pausadoAMano = true;
      v.pause();
    }
  });
  new IntersectionObserver(
    ([e]) => {
      if (e.isIntersecting && !pausadoAMano) reproducir();
      else if (!e.isIntersecting && !v.paused) v.pause();
    },
    { threshold: 0.35 },
  ).observe(v);
}

export function iniciarPagina() {
  cabecera();
  revelar();
  cabina();
  pulidora();
  video();
}
