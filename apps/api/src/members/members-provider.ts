import type { MembersProviderId } from '@bloom/shared';

/**
 * Puerto de la importación de socios (spec 002). El servicio de importación solo conoce esta interfaz;
 * el adaptador concreto se elige con la variable MEMBERS_PROVIDER.
 *
 * `fetchMembers` devuelve los socios sin validar: cada uno se valida por separado al importar, para que
 * un registro mal formado no impida importar el resto.
 */
export interface MembersProvider {
  readonly source: MembersProviderId;
  fetchMembers(): Promise<unknown[]>;
}

/** Token de inyección del puerto. */
export const MEMBERS_PROVIDER = Symbol('MEMBERS_PROVIDER');

/** El proveedor no ha respondido o su respuesta no se puede usar. El mensaje se muestra al administrador. */
export class MembersProviderError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'MembersProviderError';
  }
}
