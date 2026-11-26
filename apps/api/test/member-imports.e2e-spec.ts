import type { INestApplication } from '@nestjs/common';
import { memberImportListSchema, memberImportSchema, userSchema } from '@bloom/shared';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MembersProviderError, type MembersProvider } from '../src/members/members-provider';
import { mockMember } from '../src/members/mock-members.provider';
import type { PrismaService } from '../src/prisma/prisma.service';
import {
  createCenter,
  createTestApp,
  createUser,
  login,
  resetDatabase,
  TEST_PASSWORD,
} from './utils';

/** Proveedor controlado desde cada prueba. */
class FakeMembersProvider implements MembersProvider {
  readonly source = 'mock' as const;
  members: unknown[] = [];
  failure: Error | null = null;
  delayMs = 0;

  async fetchMembers(): Promise<unknown[]> {
    if (this.delayMs > 0) await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    if (this.failure) throw this.failure;
    return structuredClone(this.members);
  }
}

const member = (id: number, overrides: Record<string, unknown> = {}) => ({
  externalId: `EXT-${id}`,
  firstName: `Nombre${id}`,
  lastName: `Apellido${id}`,
  email: `socio${id}@socios.bloom.test`,
  ...overrides,
});

describe('Importación de socios (spec 002, integración)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const provider = new FakeMembersProvider();
  let centerId: string;
  let tokens: { admin: string; trainer: string; client: string };

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp({ membersProvider: provider }));
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    provider.members = [];
    provider.failure = null;
    provider.delayMs = 0;
    centerId = (await createCenter(prisma)).id;
    await createUser(prisma, centerId, { email: 'admin@bloom.test', role: 'ADMIN' });
    await createUser(prisma, centerId, { email: 'coach@bloom.test', role: 'TRAINER' });
    await createUser(prisma, centerId, { email: 'cliente@bloom.test', role: 'CLIENT' });
    tokens = {
      admin: (await login(app, 'admin@bloom.test')).accessToken,
      trainer: (await login(app, 'coach@bloom.test')).accessToken,
      client: (await login(app, 'cliente@bloom.test')).accessToken,
    };
  });

  afterAll(async () => {
    await app.close();
  });

  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const http = () => request(app.getHttpServer());
  const runImport = async () => {
    const res = await http().post('/member-imports').set(as(tokens.admin)).expect(201);
    return memberImportSchema.parse(res.body);
  };
  const importedUsers = () =>
    prisma.user.findMany({ where: { externalSource: 'mock' }, orderBy: { externalId: 'asc' } });

  it('solo el administrador puede importar o ver el histórico (403)', async () => {
    for (const token of [tokens.trainer, tokens.client]) {
      await http().post('/member-imports').set(as(token)).expect(403);
      await http().get('/member-imports').set(as(token)).expect(403);
    }
  });

  it('AC-002-01: da de alta como clientes los socios nuevos, pendientes de activar', async () => {
    provider.members = [member(1), member(2)];
    await runImport();

    const users = await importedUsers();
    expect(users).toHaveLength(2);
    expect(users[0]).toMatchObject({
      centerId,
      externalId: 'EXT-1',
      firstName: 'Nombre1',
      email: 'socio1@socios.bloom.test',
      role: 'CLIENT',
      isActive: true,
      passwordHash: null,
    });
  });

  it('AC-002-01: actualiza los socios existentes identificándolos por su id externo', async () => {
    provider.members = [member(1)];
    await runImport();
    const before = (await importedUsers())[0];

    provider.members = [member(1, { lastName: 'Cambiado', email: 'nuevo@socios.bloom.test' })];
    const summary = await runImport();

    const after = await importedUsers();
    expect(after).toHaveLength(1);
    expect(after[0]?.id).toBe(before?.id);
    expect(after[0]).toMatchObject({ lastName: 'Cambiado', email: 'nuevo@socios.bloom.test' });
    expect(summary).toMatchObject({ created: 0, updated: 1, unchanged: 0 });
  });

  it('AC-002-02: devuelve un resumen con altas, actualizaciones, omitidos y errores', async () => {
    provider.members = [member(1), member(2)];
    await runImport();

    provider.members = [
      member(1),
      member(2, { firstName: 'Otro' }),
      member(3),
      member(4, { email: 'no-es-un-correo' }),
    ];
    const summary = await runImport();

    expect(summary).toMatchObject({
      status: 'SUCCEEDED',
      source: 'mock',
      created: 1,
      updated: 1,
      unchanged: 1,
      deactivated: 0,
      errorCount: 1,
      triggeredBy: 'Nombre admin',
    });
    expect(summary.errors).toEqual([{ externalId: 'EXT-4', message: expect.any(String) }]);
  });

  it('AC-002-03: importar dos veces sin cambios no crea duplicados', async () => {
    provider.members = [member(1), member(2), member(3)];
    await runImport();
    const second = await runImport();

    expect(second).toMatchObject({ created: 0, updated: 0, unchanged: 3, deactivated: 0 });
    expect(await importedUsers()).toHaveLength(3);
  });

  it('AC-002-04: si el proveedor falla no se modifica nada y se informa del fallo', async () => {
    provider.members = [member(1), member(2)];
    await runImport();
    const before = await importedUsers();

    provider.members = [member(1, { firstName: 'Cambiado' })];
    provider.failure = new MembersProviderError('TIMP no ha respondido a tiempo.');
    const res = await http().post('/member-imports').set(as(tokens.admin)).expect(502);
    const body = res.body as { message: string };

    expect(body.message).toContain('TIMP no ha respondido a tiempo.');
    expect(body.message).toContain('No se ha modificado ningún dato.');
    expect(await importedUsers()).toEqual(before);

    const history = memberImportListSchema.parse(
      (await http().get('/member-imports').set(as(tokens.admin)).expect(200)).body,
    );
    expect(history.items[0]).toMatchObject({
      status: 'FAILED',
      failureReason: 'TIMP no ha respondido a tiempo.',
    });
  });

  it('AC-002-05: quien desaparece del proveedor se desactiva, pierde sus sesiones y no se borra', async () => {
    provider.members = [member(1), member(2)];
    await runImport();
    // El socio 2 activa su cuenta e inicia sesión.
    const passwordHash = (
      await prisma.user.findUniqueOrThrow({ where: { email: 'admin@bloom.test' } })
    ).passwordHash;
    await prisma.user.update({
      where: { email: 'socio2@socios.bloom.test' },
      data: { passwordHash },
    });
    const session = await login(app, 'socio2@socios.bloom.test', TEST_PASSWORD);

    provider.members = [member(1)];
    const summary = await runImport();

    expect(summary).toMatchObject({ deactivated: 1, unchanged: 1 });
    const gone = await prisma.user.findUniqueOrThrow({
      where: { email: 'socio2@socios.bloom.test' },
    });
    expect(gone.isActive).toBe(false);
    expect(gone.externalMissingSince).not.toBeNull();
    await http().post('/auth/refresh').set('Cookie', session.cookie).expect(401);
  });

  it('AC-002-05: si vuelve a aparecer se reactiva', async () => {
    provider.members = [member(1), member(2)];
    await runImport();
    provider.members = [member(1)];
    await runImport();

    provider.members = [member(1), member(2)];
    const summary = await runImport();

    expect(summary).toMatchObject({ updated: 1, unchanged: 1, deactivated: 0 });
    const back = await prisma.user.findUniqueOrThrow({
      where: { email: 'socio2@socios.bloom.test' },
    });
    expect(back).toMatchObject({ isActive: true, externalMissingSince: null });
  });

  it('no deshace una desactivación hecha a mano por el administrador', async () => {
    provider.members = [member(1)];
    await runImport();
    const user = (await importedUsers())[0];
    await http().post(`/users/${user?.id}/deactivate`).set(as(tokens.admin)).expect(200);

    const summary = await runImport();

    expect(summary).toMatchObject({ updated: 0, unchanged: 1 });
    expect((await importedUsers())[0]?.isActive).toBe(false);
  });

  it('no vincula un socio a un usuario existente con el mismo correo', async () => {
    provider.members = [member(1, { email: 'admin@bloom.test' })];
    const summary = await runImport();

    expect(summary).toMatchObject({ created: 0, errorCount: 1 });
    expect(summary.errors[0]?.message).toBe('El correo ya lo usa otro usuario de Bloom Fitness.');
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@bloom.test' } });
    expect(admin).toMatchObject({ role: 'ADMIN', externalSource: null });
  });

  it('informa de los identificadores repetidos y no desactiva a un socio por un error de formato', async () => {
    provider.members = [member(1), member(2)];
    await runImport();

    provider.members = [member(1), member(1), member(2, { email: '' })];
    const summary = await runImport();

    expect(summary).toMatchObject({ errorCount: 2, deactivated: 0, unchanged: 1 });
    expect(summary.errors.map((error) => error.externalId)).toEqual(['EXT-1', 'EXT-2']);
    expect((await importedUsers()).every((user) => user.isActive)).toBe(true);
  });

  it('rechaza una segunda importación mientras hay otra en curso (409)', async () => {
    provider.members = [member(1)];
    provider.delayMs = 300;
    const [first, second] = await Promise.all([
      http().post('/member-imports').set(as(tokens.admin)),
      http().post('/member-imports').set(as(tokens.admin)),
    ]);
    expect([first.status, second.status].sort()).toEqual([201, 409]);
  });

  it('el histórico indica el proveedor y lista las ejecuciones de la más reciente a la más antigua', async () => {
    provider.members = [member(1)];
    const first = await runImport();
    const second = await runImport();

    const history = memberImportListSchema.parse(
      (await http().get('/member-imports').set(as(tokens.admin)).expect(200)).body,
    );
    expect(history.provider).toEqual({ id: 'mock', label: 'Datos simulados' });
    expect(history.items.map((item) => item.id)).toEqual([second.id, first.id]);
  });

  describe('AC-002-07: campos protegidos de un usuario importado', () => {
    let userId: string;

    beforeEach(async () => {
      provider.members = [member(1)];
      await runImport();
      userId = (await importedUsers())[0]?.id ?? '';
    });

    it('expone el origen en el usuario', async () => {
      const res = await http().get(`/users/${userId}`).set(as(tokens.admin)).expect(200);
      expect(userSchema.parse(res.body).externalSource).toBe('mock');
    });

    it('rechaza cambiar nombre, apellidos o correo (422)', async () => {
      for (const change of [
        { firstName: 'Otro' },
        { lastName: 'Otro' },
        { email: 'otro@socios.bloom.test' },
      ]) {
        const res = await http().patch(`/users/${userId}`).set(as(tokens.admin)).send(change);
        expect(res.status).toBe(422);
        expect((res.body as { message: string }).message).toContain('Datos simulados');
      }
    });

    it('permite cambiar el alias y reenviar los campos protegidos sin cambios', async () => {
      const res = await http()
        .patch(`/users/${userId}`)
        .set(as(tokens.admin))
        .send({
          firstName: 'Nombre1',
          lastName: 'Apellido1',
          email: 'socio1@socios.bloom.test',
          alias: 'Uno',
          role: 'CLIENT',
        })
        .expect(200);
      expect(userSchema.parse(res.body).alias).toBe('Uno');
    });
  });

  it('SC-002-1: importa 200 socios simulados en menos de 5 s', async () => {
    provider.members = Array.from({ length: 200 }, (_, index) => mockMember(index));
    const started = performance.now();
    const summary = await runImport();
    const elapsed = performance.now() - started;

    expect(summary.created).toBe(200);
    expect(elapsed).toBeLessThan(5000);
  });
});

describe('Importación con el proveedor simulado real (AC-002-06)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('AC-002-06: con MEMBERS_PROVIDER=mock importa siempre los mismos socios ficticios', async () => {
    await resetDatabase(prisma);
    const centerId = (await createCenter(prisma)).id;
    await createUser(prisma, centerId, { email: 'admin@bloom.test', role: 'ADMIN' });
    const { accessToken } = await login(app, 'admin@bloom.test');
    const http = () => request(app.getHttpServer());

    const first = memberImportSchema.parse(
      (
        await http()
          .post('/member-imports')
          .set({ Authorization: `Bearer ${accessToken}` })
          .expect(201)
      ).body,
    );
    const second = memberImportSchema.parse(
      (
        await http()
          .post('/member-imports')
          .set({ Authorization: `Bearer ${accessToken}` })
          .expect(201)
      ).body,
    );

    expect(first).toMatchObject({ source: 'mock', created: 30, errorCount: 0 });
    expect(second).toMatchObject({ created: 0, updated: 0, unchanged: 30 });
    const firstMember = await prisma.user.findFirstOrThrow({ where: { externalId: 'SOC-0001' } });
    expect(firstMember).toMatchObject({
      firstName: mockMember(0).firstName,
      email: mockMember(0).email,
    });
  });
});
