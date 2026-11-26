import { describe, expect, it } from 'vitest';
import { addDays, madridToUtcIso, startOfWeek, utcToMadrid } from './dates';

describe('fechas en Europe/Madrid (constitución §4.4)', () => {
  it('convierte la hora de Madrid a UTC en invierno y en verano', () => {
    expect(madridToUtcIso('2026-12-01', '09:30')).toBe('2026-12-01T08:30:00.000Z');
    expect(madridToUtcIso('2026-07-01', '09:30')).toBe('2026-07-01T07:30:00.000Z');
  });

  it('acierta en los días de cambio de hora', () => {
    // 29 de marzo de 2026: a las 02:00 pasan a ser las 03:00.
    expect(madridToUtcIso('2026-03-29', '10:00')).toBe('2026-03-29T08:00:00.000Z');
    // 25 de octubre de 2026: a las 03:00 vuelven a ser las 02:00.
    expect(madridToUtcIso('2026-10-25', '10:00')).toBe('2026-10-25T09:00:00.000Z');
  });

  it('convierte de UTC a día y hora de Madrid, también cerca de medianoche', () => {
    expect(utcToMadrid('2026-12-01T08:30:00.000Z')).toEqual({ day: '2026-12-01', time: '09:30' });
    expect(utcToMadrid('2026-11-30T23:30:00.000Z')).toEqual({ day: '2026-12-01', time: '00:30' });
  });

  it('calcula días y el lunes de la semana', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(startOfWeek('2026-12-03')).toBe('2026-11-30');
    expect(startOfWeek('2026-12-06')).toBe('2026-11-30');
    expect(startOfWeek('2026-11-30')).toBe('2026-11-30');
  });
});
