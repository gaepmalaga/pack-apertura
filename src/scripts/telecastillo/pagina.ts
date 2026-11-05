// Lo común de la página de Telecastillo: cabecera, menú del móvil, apariciones al
// llegar, vídeos de YouTube que solo se cargan al pulsar, el mapa de la zona y el
// mes en curso en el calendario de temporadas.

const reducir = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function cabecera() {
  const cab = document.querySelector<HTMLElement>('[data-cabecera]');
  if (!cab) return;
  const mirar = () => cab.classList.toggle('solida', window.scrollY > 20);
  window.addEventListener('scroll', mirar, { passive: true });
  mirar();
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
    { rootMargin: '0px 0px -8% 0px', threshold: 0.1 },
  );
  elementos.forEach((el) => obs.observe(el));
}

/** Vídeos de YouTube: se ve la miniatura (alojada aquí) y el reproductor solo se
 *  carga al pulsar, desde youtube-nocookie. */
function videos() {
  document.querySelectorAll<HTMLButtonElement>('[data-yt]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.dataset.yt!;
      const f = document.createElement('iframe');
      f.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0&modestbranding=1`;
      f.title = b.getAttribute('aria-label') ?? 'Vídeo';
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      b.replaceWith(f);
    });
  });
}

/** Mapa: al pasar por un pueblo (en el mapa o en la lista) se marca en los dos. */
function mapa() {
  const raiz = document.querySelector<HTMLElement>('[data-mapa]');
  if (!raiz) return;
  const marcar = (n: string) => raiz.querySelectorAll<HTMLElement | SVGElement>('[data-pueblo]').forEach((el) => el.classList.toggle('activo', el.dataset.pueblo === n));
  raiz.querySelectorAll<HTMLElement | SVGElement>('[data-pueblo]').forEach((el) => {
    const n = el.dataset.pueblo!;
    el.addEventListener('pointerenter', () => marcar(n));
    el.addEventListener('focus', () => marcar(n));
    el.addEventListener('click', () => marcar(n));
  });
  raiz.addEventListener('pointerleave', () => marcar(''));
}

/** Calendario de temporadas: resalta el mes de hoy y lo que toca ahora. */
function temporadas() {
  const raiz = document.querySelector<HTMLElement>('[data-temporadas]');
  if (!raiz) return;
  const mes = new Date().getMonth() + 1;
  raiz.querySelectorAll<HTMLElement>('[data-mes]').forEach((el) => el.classList.toggle('hoy', Number(el.dataset.mes) === mes));
  raiz.querySelectorAll<HTMLElement>('[data-meses]').forEach((el) => {
    const meses = el.dataset.meses!.split(',').map(Number);
    el.classList.toggle('ahora', meses.includes(mes));
  });
  const ahora = raiz.querySelector<HTMLElement>('[data-ahora]');
  const tocan = [...raiz.querySelectorAll<HTMLElement>('[data-meses].ahora h3')].map((h) => h.textContent);
  // Lo próximo: la temporada (que no sea de todo el año) que empieza antes.
  let proxima = '';
  let falta = 13;
  raiz.querySelectorAll<HTMLElement>('[data-meses]').forEach((el) => {
    const meses = el.dataset.meses!.split(',').map(Number);
    if (meses.length === 12 || meses.includes(mes)) return;
    const d = Math.min(...meses.map((x) => (x - mes + 12) % 12));
    if (d < falta) {
      falta = d;
      proxima = el.querySelector('h3')?.textContent ?? '';
    }
  });
  if (ahora && tocan.length) ahora.textContent = `Ahora toca: ${tocan.join(' · ')}${proxima ? ` · Lo próximo: ${proxima}, ¡resérvalo ya!` : ''}`;
}

/** El castillo de la portada se infla cuando se ve (en el móvil queda más abajo). */
function inflar() {
  const escena = document.querySelector<HTMLElement>('.escena');
  if (!escena) return;
  if (reducir() || !('IntersectionObserver' in window)) {
    escena.classList.add('ver');
    return;
  }
  const obs = new IntersectionObserver(
    ([e]) => {
      if (!e.isIntersecting) return;
      escena.classList.add('ver');
      obs.disconnect();
    },
    { threshold: 0.35 },
  );
  obs.observe(escena);
}

export function iniciarPagina() {
  inflar();
  cabecera();
  revelar();
  videos();
  mapa();
  temporadas();
}
