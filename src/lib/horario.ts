// Lógica de horario sin dependencias. La usan las páginas al compilar y el
// navegador para el aviso de «Abierto ahora». Siempre en hora de Madrid.
// Un tramo que cierra a una hora menor que la de apertura (12:00–01:00) acaba
// al día siguiente.

export const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;
export type Dia = (typeof DIAS)[number];
export type Tramo = { abre: string; cierra: string };
export type HorarioSemana = Record<Dia, Tramo[]>;

export const NOMBRE_DIA: Record<Dia, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
};

const POR_INDICE: Dia[] = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

export const aMinutos = (h: string) => {
  const [hh, mm] = h.split(':').map(Number);
  return hh * 60 + mm;
};

export const formatoTramo = (t: Tramo) => `${t.abre} – ${t.cierra}`;

export function porDia(horario: { dia: Dia; abre: string; cierra: string }[] = []): HorarioSemana {
  const semana = Object.fromEntries(DIAS.map((d) => [d, [] as Tramo[]])) as HorarioSemana;
  for (const { dia, abre, cierra } of horario) semana[dia]?.push({ abre, cierra });
  for (const d of DIAS) semana[d].sort((a, b) => aMinutos(a.abre) - aMinutos(b.abre));
  return semana;
}

/** Agrupa días seguidos con el mismo horario: «Lunes a viernes», «Sábado»… */
export function agrupar(semana: HorarioSemana) {
  const grupos: { claves: Dia[]; clave: string; tramos: string[] }[] = [];
  for (const d of DIAS) {
    const tramos = semana[d].map(formatoTramo);
    const clave = tramos.join('|');
    const ultimo = grupos.at(-1);
    if (ultimo && ultimo.clave === clave) ultimo.claves.push(d);
    else grupos.push({ claves: [d], clave, tramos });
  }
  return grupos.map((g) => {
    const [a, b] = [g.claves[0], g.claves.at(-1)!];
    const dias =
      g.claves.length === 1
        ? NOMBRE_DIA[a]
        : g.claves.length === 2
          ? `${NOMBRE_DIA[a]} y ${NOMBRE_DIA[b].toLowerCase()}`
          : `${NOMBRE_DIA[a]} a ${NOMBRE_DIA[b].toLowerCase()}`;
    return { dias, claves: g.claves, tramos: g.tramos };
  });
}

/** Resumen corto para la cabecera: «L–V 9:30–20:00 · S 9:30–14:00». */
export function resumenCorto(semana: HorarioSemana) {
  const ini: Record<Dia, string> = { lunes: 'L', martes: 'M', miercoles: 'X', jueves: 'J', viernes: 'V', sabado: 'S', domingo: 'D' };
  return agrupar(semana)
    .filter((g) => g.tramos.length)
    .map((g) => {
      const d = g.claves.length === 1 ? ini[g.claves[0]] : `${ini[g.claves[0]]}–${ini[g.claves.at(-1)!]}`;
      return `${d} ${g.tramos.join(', ').replace(/ – /g, '–')}`;
    })
    .join(' · ');
}

export function ahoraEnMadrid(fecha = new Date()) {
  const partes = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(fecha);
  const v = (t: string) => partes.find((p) => p.type === t)?.value ?? '';
  const indice = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(v('weekday'));
  return { dia: POR_INDICE[indice], minuto: Number(v('hour')) * 60 + Number(v('minute')) };
}

const siguiente = (d: Dia) => DIAS[(DIAS.indexOf(d) + 1) % 7];
const anterior = (d: Dia) => DIAS[(DIAS.indexOf(d) + 6) % 7];

/** «Abierto ahora · hasta las 20:00» o «Cerrado · abre mañana a las 9:30». */
export function estadoApertura(semana: HorarioSemana, fecha = new Date()) {
  const { dia, minuto } = ahoraEnMadrid(fecha);
  // Un tramo de ayer que pasa de medianoche puede seguir abierto.
  for (const t of semana[anterior(dia)]) {
    const [a, c] = [aMinutos(t.abre), aMinutos(t.cierra)];
    if (c <= a && minuto < c) return { abierto: true, texto: `Abierto ahora · hasta las ${t.cierra}` };
  }
  for (const t of semana[dia]) {
    const [a, c] = [aMinutos(t.abre), aMinutos(t.cierra)];
    const fin = c <= a ? c + 1440 : c;
    if (minuto >= a && minuto < fin) return { abierto: true, texto: `Abierto ahora · hasta las ${t.cierra}` };
  }
  const hoy = semana[dia].find((t) => aMinutos(t.abre) > minuto);
  if (hoy) return { abierto: false, texto: `Cerrado · abre hoy a las ${hoy.abre}` };
  let d = siguiente(dia);
  for (let i = 1; i <= 7; i++, d = siguiente(d)) {
    const t = semana[d][0];
    if (t) {
      const cuando = i === 1 ? 'mañana' : `el ${NOMBRE_DIA[d].toLowerCase()}`;
      return { abierto: false, texto: `Cerrado · abre ${cuando} a las ${t.abre}` };
    }
  }
  return { abierto: false, texto: 'Cerrado' };
}
