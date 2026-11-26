const dayFormat = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeZone: 'UTC' });

/** `2026-12-01` → `1 dic 2026`. Las fechas sin hora se interpretan en UTC para que no cambie el día. */
export function formatDay(day: string): string {
  return dayFormat.format(new Date(`${day}T00:00:00.000Z`));
}

/** Fecha de hoy en Madrid como `YYYY-MM-DD`, para rellenar formularios. */
export function today(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date());
}

const dateTimeFormat = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/Madrid',
});

export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

const MADRID = 'Europe/Madrid';
const partsFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: MADRID,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function madridFields(utcMs: number) {
  const parts = Object.fromEntries(
    partsFormat.formatToParts(new Date(utcMs)).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Minutos que Madrid va por delante de UTC en ese instante (60 en invierno, 120 en verano). */
function madridOffsetMinutes(utcMs: number): number {
  const f = madridFields(utcMs);
  const asUtc = Date.UTC(f.year, f.month - 1, f.day, f.hour, f.minute, f.second);
  return Math.round((asUtc - utcMs) / 60_000);
}

/**
 * Día y hora de Madrid (`2026-12-01`, `09:30`) → instante UTC en ISO (constitución §4.4).
 * Se corrige dos veces para acertar también en los días de cambio de hora.
 */
export function madridToUtcIso(day: string, time: string): string {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number];
  const [hour, minute] = time.split(':').map(Number) as [number, number];
  const naive = Date.UTC(year, month - 1, date, hour, minute);
  let utc = naive - madridOffsetMinutes(naive) * 60_000;
  utc = naive - madridOffsetMinutes(utc) * 60_000;
  return new Date(utc).toISOString();
}

/** Instante UTC → día (`YYYY-MM-DD`) y hora (`HH:mm`) en Madrid. */
export function utcToMadrid(iso: string): { day: string; time: string } {
  const f = madridFields(Date.parse(iso));
  const pad = (value: number) => String(value).padStart(2, '0');
  return {
    day: `${f.year}-${pad(f.month)}-${pad(f.day)}`,
    time: `${pad(f.hour)}:${pad(f.minute)}`,
  };
}

/** Suma días a una fecha `YYYY-MM-DD` sin depender de la zona horaria del navegador. */
export function addDays(day: string, amount: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

/** Lunes de la semana de esa fecha. */
export function startOfWeek(day: string): string {
  const weekday = new Date(`${day}T00:00:00.000Z`).getUTCDay();
  return addDays(day, -((weekday + 6) % 7));
}

const weekdayFormat = new Intl.DateTimeFormat('es-ES', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
const longDayFormat = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** `2026-12-01` → `mar, 1 dic`. */
export function formatWeekday(day: string): string {
  return weekdayFormat.format(new Date(`${day}T00:00:00.000Z`));
}

/** `2026-12-01` → `martes, 1 de diciembre de 2026`. */
export function formatLongDay(day: string): string {
  return longDayFormat.format(new Date(`${day}T00:00:00.000Z`));
}
