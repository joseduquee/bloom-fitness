import type { SaveTemplateRequest } from '@bloom/shared';

/** Plantilla de ejemplo con los ejercicios referenciados por su nombre en el catálogo inicial. */
export interface SeedTemplate extends Omit<SaveTemplateRequest, 'items'> {
  items: (Omit<SaveTemplateRequest['items'][number], 'exerciseId'> & { exercise: string })[];
}

/** Tres días de una rutina típica de fuerza para la demostración (spec 003). */
// prettier-ignore
export const seedTemplates: SeedTemplate[] = [
  {
    name: 'Día A · Pierna',
    goal: 'Fuerza en tren inferior',
    items: [
      { exercise: 'Sentadilla con barra', sets: 4, reps: '6-8', targetLoadKg: 60, restSeconds: 150 },
      { exercise: 'Peso muerto rumano', sets: 3, reps: '8-10', targetLoadKg: 50, restSeconds: 120 },
      { exercise: 'Zancada con mancuernas', sets: 3, reps: '10 por pierna', targetLoadKg: 12, restSeconds: 90 },
      { exercise: 'Elevación de talones de pie', sets: 3, reps: '15', restSeconds: 60 },
      { exercise: 'Plancha frontal', sets: 3, reps: '40 s', restSeconds: 45 },
    ],
  },
  {
    name: 'Día B · Empuje',
    goal: 'Pecho, hombro y tríceps',
    items: [
      { exercise: 'Press de banca con barra', sets: 4, reps: '6-8', targetLoadKg: 50, restSeconds: 150 },
      { exercise: 'Press de hombro con mancuernas', sets: 3, reps: '8-10', targetLoadKg: 14, restSeconds: 120 },
      { exercise: 'Aperturas en polea', sets: 3, reps: '12', targetLoadKg: 10, restSeconds: 75 },
      { exercise: 'Extensión de tríceps en polea', sets: 3, reps: '12', targetLoadKg: 20, restSeconds: 60 },
    ],
  },
  {
    name: 'Día C · Tracción',
    goal: 'Espalda y bíceps',
    items: [
      { exercise: 'Jalón al pecho', sets: 4, reps: '8-10', targetLoadKg: 45, restSeconds: 120 },
      { exercise: 'Remo con mancuerna a una mano', sets: 3, reps: '10', targetLoadKg: 20, restSeconds: 90 },
      { exercise: 'Face pull', sets: 3, reps: '15', targetLoadKg: 15, restSeconds: 60 },
      { exercise: 'Curl martillo', sets: 3, reps: '12', targetLoadKg: 10, restSeconds: 60 },
    ],
  },
];
