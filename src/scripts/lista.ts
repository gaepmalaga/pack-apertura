// «Lo que te vas a pedir»: tocar un plato lo apunta en una lista que se queda en
// el móvil (localStorage). No se manda a ningún sitio.
type Linea = { nombre: string; precio: number; cuantos: number };

const euros = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

export function iniciarLista(slug: string) {
  const platos = [...document.querySelectorAll<HTMLButtonElement>('[data-plato]')];
  if (!platos.length) return;
  const clave = `lista-${slug}`;
  const tira = document.querySelector<HTMLButtonElement>('[data-abrir-lista]')!;
  const dialogo = document.querySelector<HTMLDialogElement>('[data-lista]')!;
  const items = dialogo.querySelector<HTMLUListElement>('[data-lista-items]')!;
  const total = dialogo.querySelector<HTMLElement>('[data-lista-total]')!;

  let lista: Record<string, Linea> = {};
  try {
    lista = JSON.parse(localStorage.getItem(clave) || '{}');
  } catch {
    lista = {};
  }
  const guardar = () => {
    try {
      localStorage.setItem(clave, JSON.stringify(lista));
    } catch {
      /* modo privado: la lista vive solo mientras la página esté abierta */
    }
  };

  function pintar() {
    const lineas = Object.values(lista).filter((l) => l.cuantos > 0);
    const unidades = lineas.reduce((s, l) => s + l.cuantos, 0);
    const suma = lineas.reduce((s, l) => s + l.cuantos * l.precio, 0);
    platos.forEach((b) => (b.dataset.cuantos = String(lista[b.dataset.plato!]?.cuantos ?? 0)));
    tira.hidden = unidades === 0;
    tira.querySelector('[data-tira-texto]')!.textContent = `Tu lista · ${unidades} · ${euros(suma)}`;
    total.textContent = euros(suma);
    items.replaceChildren(
      ...lineas.map((l) => {
        const li = document.createElement('li');
        const nombre = document.createElement('span');
        nombre.textContent = `${l.cuantos}× ${l.nombre}`;
        const menos = document.createElement('button');
        menos.type = 'button';
        menos.textContent = '−';
        menos.setAttribute('aria-label', `Quitar ${l.nombre}`);
        menos.onclick = () => cambiar(l.nombre, l.precio, -1);
        const mas = document.createElement('button');
        mas.type = 'button';
        mas.textContent = '+';
        mas.setAttribute('aria-label', `Añadir ${l.nombre}`);
        mas.onclick = () => cambiar(l.nombre, l.precio, 1);
        li.append(nombre, menos, mas);
        return li;
      }),
    );
  }

  function cambiar(nombre: string, precio: number, delta: number) {
    const l = (lista[nombre] ??= { nombre, precio, cuantos: 0 });
    l.cuantos = Math.max(0, l.cuantos + delta);
    if (!l.cuantos) delete lista[nombre];
    guardar();
    pintar();
  }

  platos.forEach((b) => b.addEventListener('click', () => cambiar(b.dataset.plato!, Number(b.dataset.precio), 1)));
  tira.addEventListener('click', () => dialogo.showModal());
  dialogo.querySelector('[data-cerrar-lista]')?.addEventListener('click', () => dialogo.close());
  // En una estética la lista acaba en cita: la apunta en el formulario y lleva a él.
  dialogo.querySelector('[data-cita-lista]')?.addEventListener('click', () => {
    const nota = document.querySelector<HTMLTextAreaElement>('#r-nota');
    const lineas = Object.values(lista).filter((l) => l.cuantos > 0);
    if (nota && lineas.length) nota.value = `Me interesa: ${lineas.map((l) => (l.cuantos > 1 ? `${l.cuantos}× ${l.nombre}` : l.nombre)).join(', ')}.`;
    dialogo.close();
    document.getElementById('reservar')?.scrollIntoView();
  });
  dialogo.querySelector('[data-borrar-lista]')!.addEventListener('click', () => {
    lista = {};
    guardar();
    pintar();
    dialogo.close();
  });
  dialogo.addEventListener('click', (e) => {
    if (e.target === dialogo) dialogo.close();
  });
  pintar();
}
