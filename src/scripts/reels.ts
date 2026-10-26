// La carta en vídeo. Lee de la propia carta los platos con foto o vídeo
// (data-foto / data-video en cada botón de plato) y monta dos cosas:
//   · la tira «La carta en vídeo», con un reel pequeño por plato
//   · el visor a pantalla completa, que se desliza en vertical como Instagram
//     y deja apuntar el plato en la lista sin salir del vídeo
// Como todo sale de la carta, el modo prueba del panel solo tiene que pintar
// la carta con sus fotos y vídeos y llamar a iniciarReels().
type Medio = { id: string; nombre: string; descripcion: string; precio: string; grupo: string; foto: string; video: string };

const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;

function leerCarta(): Medio[] {
  return [...document.querySelectorAll<HTMLButtonElement>('.plato[data-id]')]
    .filter((b) => b.dataset.foto || b.dataset.video)
    .map((b) => ({
      id: b.dataset.id!,
      nombre: b.dataset.plato!,
      descripcion: b.dataset.desc ?? '',
      precio: b.querySelector('.p')?.textContent ?? '',
      grupo: b.dataset.grupo ?? '',
      foto: b.dataset.foto ?? '',
      video: b.dataset.video ?? '',
    }));
}

function crearMedio(m: Medio, clase: string) {
  if (m.video) {
    const v = document.createElement('video');
    v.className = clase;
    v.src = m.video;
    if (m.foto) v.poster = m.foto;
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = 'metadata';
    v.setAttribute('aria-hidden', 'true');
    return v;
  }
  const img = document.createElement('img');
  img.className = clase;
  img.src = m.foto;
  img.alt = '';
  img.loading = 'lazy';
  return img;
}

/** Reproduce los vídeos que se ven y para los demás. */
function vigilar(raiz: Element | null, umbral: number) {
  return new IntersectionObserver(
    (entradas) =>
      entradas.forEach((e) => {
        const v = e.target.querySelector('video');
        if (!v) return;
        if (e.isIntersecting && !quieto) v.play().catch(() => {});
        else v.pause();
      }),
    { root: raiz, threshold: umbral },
  );
}

let observadorTira: IntersectionObserver | undefined;
// Las de la última llamada: el modo prueba puede volver a iniciar con otra carta.
let abrirActual = (_id: string) => {};
let cerrarActual = () => {};

export function iniciarReels() {
  const medios = leerCarta();
  const seccion = document.querySelector<HTMLElement>('[data-reels-seccion]');
  const tira = document.querySelector<HTMLElement>('[data-reels-tira]');
  const dialogo = document.querySelector<HTMLDialogElement>('[data-reels]');
  if (!dialogo) return;
  const pista = dialogo.querySelector<HTMLElement>('[data-reels-pista]')!;

  // Tira de reels: solo los platos con vídeo, que son los que lucen en movimiento.
  observadorTira?.disconnect();
  const conVideo = medios.filter((m) => m.video);
  if (seccion && tira) {
    seccion.hidden = conVideo.length === 0;
    observadorTira = vigilar(null, 0.6);
    tira.replaceChildren(
      ...conVideo.map((m) => {
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'reel-tarjeta';
        b.dataset.verReel = m.id;
        b.setAttribute('aria-label', `Ver el vídeo de ${m.nombre}`);
        const pie = document.createElement('span');
        pie.className = 'reel-pie';
        const nombre = document.createElement('b');
        nombre.textContent = m.nombre;
        const precio = document.createElement('span');
        precio.textContent = m.precio;
        pie.append(nombre, precio);
        b.append(crearMedio(m, 'reel-medio'), pie);
        li.append(b);
        observadorTira!.observe(b);
        return li;
      }),
    );
  }

  // Visor a pantalla completa: todos los platos con foto o vídeo, en el orden de la carta.
  const observadorVisor = vigilar(pista, 0.6);
  function abrir(id: string) {
    observadorVisor.disconnect();
    pista.replaceChildren(
      ...medios.map((m, i) => {
        const art = document.createElement('article');
        art.className = 'reel';
        art.dataset.id = m.id;
        const info = document.createElement('div');
        info.className = 'reel-info';
        const grupo = document.createElement('span');
        grupo.className = 'etiqueta';
        grupo.textContent = m.grupo;
        const h = document.createElement('h3');
        h.textContent = m.nombre;
        info.append(grupo, h);
        if (m.descripcion) {
          const d = document.createElement('p');
          d.textContent = m.descripcion;
          info.append(d);
        }
        const apuntar = document.createElement('button');
        apuntar.type = 'button';
        apuntar.className = 'boton principal';
        apuntar.textContent = m.precio ? `Apuntar · ${m.precio}` : 'Apuntar';
        apuntar.onclick = () => {
          const plato = document.querySelector<HTMLButtonElement>(`.plato[data-id="${CSS.escape(m.id)}"]`);
          plato?.click();
          apuntar.textContent = `Apuntado ✓ · llevas ${plato?.dataset.cuantos ?? 1}`;
        };
        info.append(apuntar);
        if (i === 0 && medios.length > 1) {
          const aviso = document.createElement('span');
          aviso.className = 'reel-desliza';
          aviso.textContent = 'Desliza para ver más';
          info.append(aviso);
        }
        art.append(crearMedio(m, 'reel-medio'), info);
        observadorVisor.observe(art);
        return art;
      }),
    );
    dialogo!.showModal();
    pista.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'start' });
  }

  function cerrar() {
    pista.querySelectorAll('video').forEach((v) => v.pause());
    observadorVisor.disconnect();
    pista.replaceChildren();
  }

  abrirActual = abrir;
  cerrarActual = cerrar;
  // Un solo escuchador para la tira y las miniaturas de la carta, aunque se repinten.
  if (!dialogo.dataset.listo) {
    dialogo.dataset.listo = '1';
    document.addEventListener('click', (e) => {
      const b = (e.target as Element).closest<HTMLElement>('[data-ver-reel]');
      if (b) abrirActual(b.dataset.verReel!);
    });
    dialogo.querySelector('[data-cerrar-reels]')!.addEventListener('click', () => dialogo.close());
    dialogo.addEventListener('close', () => cerrarActual());
  }
}
