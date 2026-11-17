// Fechas y horas en lenguaje natural dentro del texto de una tarea: «Llamar a mamá mañana
// a las 10», «Pagar el alquiler el 1 de diciembre», «Cena a las 21»…
// Devuelve la fecha (YYYY-MM-DD), la hora si la hay (HH:MM), el texto sin las expresiones
// y los trozos detectados.

export type DetectedDate = { due: string; time?: string; title: string; match: string };

const WEEKDAYS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const NUMBERS: Record<string, number> = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  quince: 15,
};

const iso = (d: Date) => d.toLocaleDateString("sv-SE");
const fromISO = (s: string) => new Date(s + "T00:00");
const addDays = (s: string, n: number) => {
  const d = fromISO(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
const addMonths = (s: string, n: number) => {
  const d = fromISO(s);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return iso(d);
};
// Próximo día de la semana `wd` (0 = domingo), a partir de mañana.
const nextWeekday = (today: string, wd: number) => addDays(today, ((wd - fromISO(today).getDay() + 7) % 7) || 7);
// Fecha válida o null (descarta el 31 de febrero y similares).
function makeDate(y: number, m: number, d: number): string | null {
  const date = new Date(y, m, d);
  return date.getMonth() === m && date.getDate() === d ? iso(date) : null;
}
// Día y mes sin año: este año o, si ya ha pasado, el siguiente.
function upcoming(today: string, m: number, d: number): string | null {
  const y = fromISO(today).getFullYear();
  const date = makeDate(y, m, d);
  if (!date) return makeDate(y + 1, m, d);
  return date < today ? makeDate(y + 1, m, d) : date;
}

const WD = `(${WEEKDAYS.join("|")})`;
const MO = `(${MONTHS.join("|")}|setiembre)`;
const NUM = `(\\d{1,3}|${Object.keys(NUMBERS).join("|")})`;
const monthIndex = (s: string) => (s === "setiembre" ? 8 : MONTHS.indexOf(s));
const toNumber = (s: string) => NUMBERS[s] ?? Number(s);

type Rule = { re: string; resolve: (m: RegExpMatchArray, today: string) => string | null };

// De más larga a más corta: gana la primera que encaja en cada posición.
const RULES: Rule[] = [
  { re: "pasado manana", resolve: (_, t) => addDays(t, 2) },
  { re: "(?:la )?semana (?:que viene|proxima)|(?:la )?proxima semana", resolve: (_, t) => nextWeekday(t, 1) },
  { re: "(?:el |este )?(?:fin de semana|finde)", resolve: (_, t) => (fromISO(t).getDay() === 6 ? t : nextWeekday(t, 6)) },
  { re: "(?:el )?mes (?:que viene|proximo)|(?:el )?proximo mes", resolve: (_, t) => addMonths(t.slice(0, 8) + "01", 1) },
  {
    re: `(?:en|dentro de) ${NUM} (dias?|semanas?|mes(?:es)?)`,
    resolve: (m, t) => {
      const n = toNumber(m[1]);
      if (m[2].startsWith("dia")) return addDays(t, n);
      if (m[2].startsWith("semana")) return addDays(t, n * 7);
      return addMonths(t, n);
    },
  },
  {
    // «el próximo lunes», «el lunes que viene»: el de la semana siguiente si el de esta semana aún no ha llegado.
    re: `(?:el )?proximo ${WD}|(?:el )?${WD} (?:que viene|proximo)`,
    resolve: (m, t) => {
      const wd = WEEKDAYS.indexOf(m[1] ?? m[2]);
      const next = nextWeekday(t, wd);
      // Si cae en esta misma semana (antes del domingo), se pasa a la siguiente.
      const daysToSunday = (7 - fromISO(t).getDay()) % 7;
      return Math.round((fromISO(next).getTime() - fromISO(t).getTime()) / 864e5) <= daysToSunday ? addDays(next, 7) : next;
    },
  },
  { re: `(?:el |este )?${WD}`, resolve: (m, t) => nextWeekday(t, WEEKDAYS.indexOf(m[1])) },
  {
    re: `(?:el )?(\\d{1,2}) de ${MO}(?: de (\\d{4}))?`,
    resolve: (m, t) => (m[3] ? makeDate(+m[3], monthIndex(m[2]), +m[1]) : upcoming(t, monthIndex(m[2]), +m[1])),
  },
  {
    re: `(?:el )?(\\d{1,2})/(\\d{1,2})(?:/(\\d{2}|\\d{4}))?`,
    resolve: (m, t) => {
      if (!m[3]) return upcoming(t, +m[2] - 1, +m[1]);
      const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
      return makeDate(y, +m[2] - 1, +m[1]);
    },
  },
  {
    // «el 15»: ese día de este mes o, si ya ha pasado, del siguiente.
    re: "el (\\d{1,2})",
    resolve: (m, t) => {
      const day = +m[1];
      const d = fromISO(t);
      const thisMonth = makeDate(d.getFullYear(), d.getMonth(), day);
      if (thisMonth && thisMonth >= t) return thisMonth;
      return makeDate(d.getFullYear(), d.getMonth() + 1, day) ?? makeDate(d.getFullYear(), d.getMonth() + 2, day);
    },
  },
  { re: "manana", resolve: (_, t) => addDays(t, 1) },
  { re: "hoy", resolve: (_, t) => t },
];

// Horas: «a las 10», «a la 1», «a las 21:30», «a las 10h», «a las 9 de la noche»,
// «a las 5 y media», «a las 9 AM», «a mediodía», o una hora suelta con minutos o AM/PM
// («18:45», «9pm»).
const AMPM = "(?<ampm>am|pm|a\\.m\\.|p\\.m\\.)";
const TIME_RULES: { re: string; resolve: (m: RegExpMatchArray) => string | null }[] = [
  { re: "a(?:l)? mediodia", resolve: () => "12:00" },
  { re: "a medianoche", resolve: () => "00:00" },
  {
    re:
      "a las? (?<h>\\d{1,2})(?:[:.](?<min>\\d{2}))?(?: ?h(?:oras?)?| ?" + AMPM + ")?" +
      "(?: (?<frac>y media|y cuarto|menos cuarto))?(?: (?:de la|por la) (?<part>manana|tarde|noche|madrugada))?",
    resolve: (m) => {
      const g = m.groups!;
      let h = +g.h;
      let min = g.min ? +g.min : 0;
      if (g.frac === "y media") min = 30;
      else if (g.frac === "y cuarto") min = 15;
      else if (g.frac === "menos cuarto") {
        min = 45;
        h = (h + 23) % 24;
      }
      if ((g.part === "tarde" || g.part === "noche") && h < 12) h += 12;
      if (g.part === "noche" && h === 12) h = 0;
      return g.ampm ? ampm(h, min, g.ampm) : clock(h, min);
    },
  },
  { re: "(?<h>\\d{1,2})(?::(?<min>\\d{2}))? ?" + AMPM, resolve: (m) => ampm(+m.groups!.h, +(m.groups!.min ?? 0), m.groups!.ampm) },
  { re: "(\\d{1,2}):(\\d{2})", resolve: (m) => clock(+m[1], +m[2]) },
];

// 12 AM = 00:00, 12 PM = 12:00.
function ampm(h: number, min: number, suffix: string): string | null {
  if (h < 1 || h > 12) return null;
  return clock((h % 12) + (suffix.startsWith("p") ? 12 : 0), min);
}

function clock(h: number, min: number): string | null {
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

const boundary = (re: string) => new RegExp(`(?<![\\p{L}\\d/:.])(?:${re})(?![\\p{L}\\d/:])`, "u");
const COMPILED_TIMES = TIME_RULES.map((r) => ({ ...r, regex: boundary(r.re) }));

const COMPILED = RULES.map((r) => ({
  ...r,
  regex: new RegExp(`(?<![\\p{L}\\d/])(?:${r.re})(?![\\p{L}\\d/])`, "u"),
}));

// Minúsculas y sin tildes, conservando la longitud para poder recortar el texto original.
const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

type Found = { index: number; length: number; value: string };

// De todas las expresiones encontradas, la que empieza antes; a igualdad, la más larga.
function first<R extends { regex: RegExp }>(
  text: string,
  rules: R[],
  resolve: (r: R, m: RegExpMatchArray) => string | null,
): Found | null {
  let best: Found | null = null;
  for (const rule of rules) {
    const m = text.match(rule.regex);
    if (!m || m.index === undefined) continue;
    const value = resolve(rule, m);
    if (!value) continue;
    if (!best || m.index < best.index || (m.index === best.index && m[0].length > best.length)) {
      best = { index: m.index, length: m[0].length, value };
    }
  }
  return best;
}

const currentTime = () => new Date().toTimeString().slice(0, 5);

export function detectDate(text: string, today: string, now = currentTime()): DetectedDate | null {
  const original = text.normalize("NFC");
  let folded = fold(original);
  if (folded.length !== original.length) return null; // caracteres raros: mejor no tocar nada

  // Primero la hora, para que «a las 10 de la mañana» no se lea como «mañana».
  const time = first(folded, COMPILED_TIMES, (r, m) => r.resolve(m));
  if (time) folded = folded.slice(0, time.index) + " ".repeat(time.length) + folded.slice(time.index + time.length);
  const date = first(folded, COMPILED, (r, m) => r.resolve(m, today));
  if (!date && !time) return null;

  // Solo hora: hoy si aún no ha pasado; si no, mañana.
  const due = date?.value ?? (time!.value > now ? today : addDays(today, 1));

  const parts = [date, time].filter((f): f is Found => !!f).sort((a, b) => a.index - b.index);
  let title = "";
  let pos = 0;
  for (const p of parts) {
    title += original.slice(pos, p.index) + " ";
    pos = p.index + p.length;
  }
  title = (title + original.slice(pos)).replace(/\s+/g, " ").trim();
  // «Mañana dentista» → «Dentista»: si la fecha iba delante, la mayúscula pasa a la tarea.
  if (parts[0].index === 0 && /^\p{Lu}/u.test(original)) title = title.charAt(0).toUpperCase() + title.slice(1);
  // Si solo se ha escrito la fecha, no hay tarea que crear con ella.
  if (!title) return null;

  const match = parts.map((p) => original.slice(p.index, p.index + p.length)).join(" ");
  return { due, time: time?.value, title, match };
}
