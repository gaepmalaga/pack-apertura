// Detalles de la página de Taller.Es que no son de ninguna sección en concreto:
// la cabecera que se oscurece al bajar, los textos que aparecen al llegar a
// ellos, los números de la foto de la cabina y el vídeo.

const reducir = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function cabecera() {
  const cab = document.querySelector<HTMLElement>('[data-cabecera]');
  if (!cab) return;
  const progreso = cab.querySelector<HTMLElement>('[data-progreso]');
  let pendiente = false;
  const mirar = () => {
    pendiente = false;
    cab.classList.toggle('solida', window.scrollY > 24);
    const total = document.documentElement.scrollHeight - window.innerHeight;
    progreso?.style.setProperty('--progreso', String(Math.min(1, window.scrollY / Math.max(1, total))));
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!pendiente) {
        pendiente = true;
        requestAnimationFrame(mirar);
      }
    },
    { passive: true },
  );
  mirar();

  // La sección en la que estás se marca en el menú con un tubo de luz debajo.
  const menu = cab.querySelector<HTMLElement>('[data-menu]');
  const luz = cab.querySelector<HTMLElement>('[data-menu-luz]');
  const enlaces = [...(menu?.querySelectorAll<HTMLAnchorElement>('a[href^="#"]') ?? [])];
  const marcar = (id: string) => {
    let actual: HTMLAnchorElement | undefined;
    for (const a of enlaces) {
      const es = a.hash === `#${id}`;
      a.setAttribute('aria-current', String(es));
      if (es) actual = a;
    }
    if (!luz) return;
    if (!actual) {
      luz.style.opacity = '0';
      return;
    }
    luz.style.opacity = '1';
    luz.style.width = `${actual.offsetWidth - 22}px`;
    luz.style.transform = `translateX(${actual.offsetLeft + 11}px)`;
  };
  const secciones = enlaces.map((a) => document.querySelector<HTMLElement>(a.hash)).filter((x): x is HTMLElement => !!x);
  const visibles = new Map<string, boolean>();
  const obs = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) visibles.set(e.target.id, e.isIntersecting);
      const primera = secciones.find((sec) => visibles.get(sec.id));
      marcar(primera?.id ?? '');
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  secciones.forEach((sec) => obs.observe(sec));

  // Menú del móvil: un <dialog> a pantalla completa (Esc y foco, de serie).
  const dialogo = document.querySelector<HTMLDialogElement>('[data-menu-movil]');
  const abrir = cab.querySelector<HTMLButtonElement>('[data-abrir-menu]');
  if (dialogo && abrir) {
    abrir.addEventListener('click', () => {
      dialogo.showModal();
      abrir.setAttribute('aria-expanded', 'true');
    });
    dialogo.addEventListener('close', () => abrir.setAttribute('aria-expanded', 'false'));
    dialogo.querySelectorAll('[data-cerrar-menu]').forEach((el) => el.addEventListener('click', () => dialogo.close()));
  }
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
  // Pantalla completa (en iPhone, el reproductor propio del sistema).
  const completa = document.querySelector<HTMLButtonElement>('[data-video-completa]');
  completa?.addEventListener('click', () => {
    const iphone = v as HTMLVideoElement & { webkitEnterFullscreen?: () => void };
    if (v.requestFullscreen) v.requestFullscreen().catch(() => iphone.webkitEnterFullscreen?.());
    else iphone.webkitEnterFullscreen?.();
    pausadoAMano = false;
    reproducir();
  });
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
  video();
}
