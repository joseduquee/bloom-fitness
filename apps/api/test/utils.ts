import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { hash } from '@node-rs/argon2';
import type { Role, SessionResponse } from '@bloom/shared';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.factory';
import { MEMBERS_PROVIDER, type MembersProvider } from '../src/members/members-provider';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Arranca el API completo, igual que en producción, contra la base de datos de pruebas.
 * Se puede sustituir el proveedor de socios por uno controlado desde la prueba.
 */
export async function createTestApp(
  options: { membersProvider?: MembersProvider } = {},
): Promise<{ app: INestApplication; prisma: PrismaService }> {
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (options.membersProvider) {
    builder = builder.overrideProvider(MEMBERS_PROVIDER).useValue(options.membersProvider);
  }
  const moduleRef = await builder.compile();
  const app = configureApp(moduleRef.createNestApplication({ bufferLogs: true }));
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

/** Deja la base de datos vacía antes de cada prueba. */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "exercises", "member_imports", "activation_tokens", "refresh_tokens", "users", "centers" CASCADE',
  );
}

export const TEST_PASSWORD = 'contraseña-de-prueba';

let passwordHashCache: string | undefined;

export async function createCenter(prisma: PrismaService, name = 'Centro de pruebas') {
  return prisma.center.create({ data: { name } });
}

export async function createUser(
  prisma: PrismaService,
  centerId: string,
  data: { email: string; role: Role; isActive?: boolean; withPassword?: boolean },
) {
  passwordHashCache ??= await hash(TEST_PASSWORD);
  return prisma.user.create({
    data: {
      centerId,
      email: data.email,
      firstName: 'Nombre',
      lastName: data.email.split('@')[0] ?? 'Apellido',
      role: data.role,
      isActive: data.isActive ?? true,
      passwordHash: data.withPassword === false ? null : passwordHashCache,
    },
  });
}

/** Inicia sesión y devuelve el token de acceso y la cookie de refresco. */
export async function login(
  app: INestApplication,
  email: string,
  password = TEST_PASSWORD,
): Promise<{ accessToken: string; cookie: string; body: SessionResponse }> {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);
  const body = res.body as SessionResponse;
  return { accessToken: body.accessToken, cookie: refreshCookie(res.headers['set-cookie']), body };
}

/** Extrae `bloom_rt=...` de las cabeceras Set-Cookie. */
export function refreshCookie(header: string | string[] | undefined): string {
  const cookies = Array.isArray(header) ? header : header ? [header] : [];
  const cookie = cookies.find((value) => value.startsWith('bloom_rt='));
  if (!cookie) throw new Error('La respuesta no fija la cookie de refresco');
  return cookie.split(';')[0] ?? '';
}
