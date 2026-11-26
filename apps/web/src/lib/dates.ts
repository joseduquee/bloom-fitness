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
