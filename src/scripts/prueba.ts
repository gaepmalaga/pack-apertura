// Modo prueba del panel de las demos. El panel guarda los cambios en el propio
// navegador (localStorage) y la web los aplica al abrirse con ?prueba. Nada se
// publica: sirve para que el dueño del negocio vea cómo cambiaría su web.
// Las fotos y vídeos que sube no caben en localStorage: van a IndexedDB, y el
// plato guarda «prueba:<clave>» en lugar de la ruta.
import { porDia, resumenCorto, type Dia } from '../lib/horario';
import { htmlHorario, type VistaHorario } from '../lib/vista-horario';
import { htmlGrupo } from '../lib/carta';

export type Prueba = {
  eslogan?: string;
  telefono?: string;
  horario?: { dia: Dia; abre: string; cierra: string }[];
  carta?: { titulo: string; platos: { nombre: string; descripcion?: string; precio?: number; foto?: string; video?: string }[] }[];
};

const PREFIJO = 'prueba:';

function almacen(): Promise<IDBDatabase> {
  return new Promise((ok, mal) => {
    const pet = indexedDB.open('prueba-medios', 1);
    pet.onupgradeneeded = () => pet.result.createObjectStore('medios');
    pet.onsuccess = () => ok(pet.result);
    pet.onerror = () => mal(pet.error);
  });
}

/** Guarda una foto o un vídeo subido desde el panel y devuelve la referencia para el plato. */
export async function guardarMedio(archivo: Blob): Promise<string> {
  const clave = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const db = await almacen();
  await new Promise((ok, mal) => {
    const t = db.transaction('medios', 'readwrite');
    t.objectStore('medios').put(archivo, clave);
    t.oncomplete = ok;
    t.onerror = () => mal(t.error);
  });
  return PREFIJO + clave;
}

/** Convierte «prueba:<clave>» en una dirección que el navegador puede pintar. Las rutas normales pasan tal cual. */
export async function resolverMedio(ref?: string): Promise<string | undefined> {
  if (!ref?.startsWith(PREFIJO)) return ref;
  try {
    const db = await almacen();
    const blob = await new Promise<Blob | undefined>((ok, mal) => {
      const pet = db.transaction('medios').objectStore('medios').get(ref.slice(PREFIJO.length));
      pet.onsuccess = () => ok(pet.result);
      pet.onerror = () => mal(pet.error);
    });
    return blob ? URL.createObjectURL(blob) : undefined;
  } catch {
    return undefined;
  }
}

export async function borrarMedios() {
  try {
    const db = await almacen();
    db.transaction('medios', 'readwrite').objectStore('medios').clear();
  } catch {
    /* sin IndexedDB no había nada guardado */
  }
}

export const clavePrueba = (slug: string) => `prueba-${slug}`;

export function leerPrueba(slug: string): Prueba | null {
  try {
    return JSON.parse(localStorage.getItem(clavePrueba(slug)) || 'null');
  } catch {
    return null;
  }
}

/** Aplica los cambios de prueba a la página. Modifica datos.horario para que el «abierto ahora» los use. */
export async function aplicarPrueba(datos: { slug: string; horario: unknown[]; admin: string }) {
  if (!new URLSearchParams(location.search).has('prueba')) return;
  const p = leerPrueba(datos.slug);
  if (!p) return;

  if (p.eslogan) document.querySelectorAll('[data-campo="eslogan"]').forEach((el) => (el.textContent = p.eslogan!));
  if (p.telefono) {
    const tel = `tel:+34${p.telefono.replace(/\D/g, '').replace(/^34/, '')}`;
    document.querySelectorAll('[data-campo="telefono"]').forEach((el) => (el.textContent = p.telefono!));
    document.querySelectorAll<HTMLAnchorElement>('a[href^="tel:"]').forEach((a) => (a.href = tel));
  }
  if (p.horario) {
    datos.horario = p.horario;
    const semana = porDia(p.horario);
    document.querySelectorAll('[data-campo="resumen"]').forEach((el) => (el.textContent = resumenCorto(semana) || 'Cerrado'));
    document.querySelectorAll<HTMLElement>('[data-vista-horario]').forEach((caja) => {
      caja.innerHTML = htmlHorario(caja.dataset.vistaHorario as VistaHorario, semana);
    });
  }
  const grupos = document.querySelector('[data-carta-grupos]');
  if (p.carta && grupos) {
    const carta = await Promise.all(
      p.carta
        .filter((g) => g.platos.length)
        .map(async (g) => ({
          titulo: g.titulo,
          platos: await Promise.all(g.platos.map(async (pl) => ({ ...pl, foto: await resolverMedio(pl.foto), video: await resolverMedio(pl.video) }))),
        })),
    );
    grupos.innerHTML = carta.map(htmlGrupo).join('');
  }

  const aviso = document.createElement('div');
  aviso.className = 'aviso-prueba';
  aviso.innerHTML = `Estás viendo tus cambios de prueba. No se ha publicado nada. <a href="${datos.admin}">Volver al panel</a>`;
  document.body.prepend(aviso);
}
