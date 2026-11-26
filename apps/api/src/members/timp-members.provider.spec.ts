import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { MembersProviderError } from './members-provider';
import { TimpMembersProvider } from './timp-members.provider';

interface FakeTimp {
  url: string;
  requests: { path: string | undefined; headers: IncomingHttpHeaders }[];
}

/** Servidor HTTP local que imita a TIMP. Las pruebas no salen a la red. */
let server: Server | undefined;

async function startTimp(
  handler: (respond: (status: number, body: string) => void) => void,
): Promise<FakeTimp> {
  const requests: FakeTimp['requests'] = [];
  server = createServer((req, res) => {
    requests.push({ path: req.url, headers: req.headers });
    handler((status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(body);
    });
  });
  await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}/api/`, requests };
}

afterEach(async () => {
  await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
  server = undefined;
});

describe('TimpMembersProvider', () => {
  it('pide los socios con la clave y traduce sus campos a los del puerto', async () => {
    const timp = await startTimp((respond) =>
      respond(
        200,
        JSON.stringify({
          items: [
            { id: 7, name: 'Lucía', surname: 'Martín', email: 'l@x.es', phone: '600000000' },
            { id: 'A8', name: 'Hugo' },
          ],
        }),
      ),
    );
    const provider = new TimpMembersProvider({ baseUrl: timp.url, apiKey: 'clave-de-prueba' });

    const members = await provider.fetchMembers();

    expect(timp.requests[0]?.path).toBe('/api/members');
    expect(timp.requests[0]?.headers.authorization).toBe('Bearer clave-de-prueba');
    // Solo se quedan los campos mínimos: el teléfono no se lee (RNF-08).
    expect(members).toEqual([
      { externalId: '7', firstName: 'Lucía', lastName: 'Martín', email: 'l@x.es' },
      { externalId: 'A8', firstName: 'Hugo', lastName: '', email: '' },
    ]);
  });

  it('AC-002-04: lanza un error del proveedor si TIMP responde con un estado de error', async () => {
    const timp = await startTimp((respond) => respond(503, '{}'));
    const provider = new TimpMembersProvider({ baseUrl: timp.url, apiKey: 'k' });
    await expect(provider.fetchMembers()).rejects.toThrow(
      new MembersProviderError('TIMP ha respondido con el estado 503.'),
    );
  });

  it('AC-002-04: lanza un error del proveedor si la respuesta no tiene el formato esperado', async () => {
    const timp = await startTimp((respond) => respond(200, JSON.stringify({ data: [] })));
    const provider = new TimpMembersProvider({ baseUrl: timp.url, apiKey: 'k' });
    await expect(provider.fetchMembers()).rejects.toThrow(/formato esperado/);
  });

  it('AC-002-04: lanza un error del proveedor si TIMP no responde a tiempo', async () => {
    const timp = await startTimp(() => undefined);
    const provider = new TimpMembersProvider({ baseUrl: timp.url, apiKey: 'k', timeoutMs: 100 });
    await expect(provider.fetchMembers()).rejects.toThrow('TIMP no ha respondido a tiempo.');
  });

  it('AC-002-04: lanza un error del proveedor si no se puede conectar', async () => {
    const provider = new TimpMembersProvider({ baseUrl: 'http://127.0.0.1:1', apiKey: 'k' });
    await expect(provider.fetchMembers()).rejects.toThrow('No se ha podido conectar con TIMP.');
  });
});
