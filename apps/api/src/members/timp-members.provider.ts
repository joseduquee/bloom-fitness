import { z } from 'zod';
import { MembersProviderError, type MembersProvider } from './members-provider';

export interface TimpConfig {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
}

/**
 * Forma de la respuesta que se ha supuesto para TIMP. El contrato real no es público: si se integrara,
 * solo cambiaría este esquema y la función `toMember`. Solo se leen los campos mínimos (RNF-08).
 */
const timpResponseSchema = z.object({ items: z.array(z.unknown()) });

const timpMemberSchema = z.looseObject({
  id: z.union([z.string(), z.number()]).optional(),
  name: z.string().optional(),
  surname: z.string().optional(),
  email: z.string().optional(),
});

function toMember(item: unknown): unknown {
  const parsed = timpMemberSchema.safeParse(item);
  if (!parsed.success) return item;
  const { id, name, surname, email } = parsed.data;
  return {
    externalId: id === undefined ? '' : String(id),
    firstName: name ?? '',
    lastName: surname ?? '',
    email: email ?? '',
  };
}

/** Adaptador HTTP para TIMP (spec 002). No se usa con datos reales en el TFT. */
export class TimpMembersProvider implements MembersProvider {
  readonly source = 'timp' as const;

  constructor(private readonly config: TimpConfig) {}

  async fetchMembers(): Promise<unknown[]> {
    const url = `${this.config.baseUrl.replace(/\/+$/, '')}/members`;
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${this.config.apiKey}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(this.config.timeoutMs ?? 10_000),
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === 'TimeoutError';
      throw new MembersProviderError(
        timedOut ? 'TIMP no ha respondido a tiempo.' : 'No se ha podido conectar con TIMP.',
        { cause: error },
      );
    }

    if (!response.ok) {
      throw new MembersProviderError(`TIMP ha respondido con el estado ${response.status}.`);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch (error) {
      throw new MembersProviderError('La respuesta de TIMP no es JSON válido.', { cause: error });
    }

    const parsed = timpResponseSchema.safeParse(body);
    if (!parsed.success) {
      throw new MembersProviderError('La respuesta de TIMP no tiene el formato esperado.');
    }
    return parsed.data.items.map(toMember);
  }
}
