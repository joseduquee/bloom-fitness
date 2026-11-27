import { z } from 'zod';
import { screenSessionSchema } from './realtime';

/** Spec 005 · Pantallas de sala. */

/** Sin letras ni números que se confundan a distancia (0/O, 1/I/L). */
export const PAIRING_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const PAIRING_CODE_LENGTH = 6;
export const PAIRING_CODE_TTL_MINUTES = 10;

export const screenStatusSchema = z.enum(['PENDING', 'PAIRED', 'REVOKED']);
export type ScreenStatus = z.infer<typeof screenStatusSchema>;

export const screenStatusLabels: Record<ScreenStatus, string> = {
  PENDING: 'Pendiente de emparejar',
  PAIRED: 'Emparejada',
  REVOKED: 'Revocada',
};

export const screenSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  status: screenStatusSchema,
  pairedAt: z.iso.datetime().nullable(),
  lastSeenAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type Screen = z.infer<typeof screenSchema>;

export const screenListSchema = z.object({ items: z.array(screenSchema) });
export type ScreenList = z.infer<typeof screenListSchema>;

/** AC-005-01. */
export const createScreenRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.')
    .max(60, 'El nombre no puede superar 60 caracteres.'),
});
export type CreateScreenRequest = z.input<typeof createScreenRequestSchema>;

/** Código de emparejamiento recién generado. Solo se muestra una vez. */
export const pairingCodeSchema = z.object({
  screen: screenSchema,
  code: z.string().length(PAIRING_CODE_LENGTH),
  expiresAt: z.iso.datetime(),
});
export type PairingCode = z.infer<typeof pairingCodeSchema>;

/** AC-005-02: el televisor envía el código. Se admite en minúsculas y con espacios. */
export const pairScreenRequestSchema = z.object({
  code: z
    .string()
    .transform((value) => value.replace(/[\s-]/g, '').toUpperCase())
    .pipe(
      z
        .string()
        .length(PAIRING_CODE_LENGTH, `El código tiene ${PAIRING_CODE_LENGTH} caracteres.`)
        .regex(new RegExp(`^[${PAIRING_CODE_ALPHABET}]+$`), 'El código no es válido.'),
    ),
});
export type PairScreenRequest = z.input<typeof pairScreenRequestSchema>;

export const pairScreenResponseSchema = z.object({
  /** Token del dispositivo. El televisor lo guarda y lo envía al conectarse. */
  token: z.string(),
  screen: z.object({ id: z.uuid(), name: z.string() }),
});
export type PairScreenResponse = z.infer<typeof pairScreenResponseSchema>;

/** Estado inicial que recibe una pantalla al conectarse (AC-005-05, AC-005-06). */
export const screenStateSchema = z.object({
  screen: z.object({ id: z.uuid(), name: z.string() }),
  center: z.object({ name: z.string(), timezone: z.string() }),
  sessions: z.array(screenSessionSchema),
});
export type ScreenState = z.infer<typeof screenStateSchema>;
