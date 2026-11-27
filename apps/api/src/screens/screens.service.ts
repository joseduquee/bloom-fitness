import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PAIRING_CODE_ALPHABET,
  PAIRING_CODE_LENGTH,
  PAIRING_CODE_TTL_MINUTES,
  type PairingCode,
  type PairScreenResponse,
  type Screen as ScreenDto,
  type ScreenList,
} from '@bloom/shared';
import { randomInt } from 'node:crypto';
import { Subject, type Observable } from 'rxjs';
import type { AuthUser } from '../auth/auth-user';
import { LoginAttemptsService } from '../auth/login-attempts.service';
import { generateOpaqueToken, hashOpaqueToken } from '../auth/opaque-token';
import type { Screen } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Pantalla identificada por su token de dispositivo. */
export interface AuthScreen {
  id: string;
  name: string;
  centerId: string;
}

const INVALID_CODE = 'El código no es válido o ha caducado. Pide uno nuevo al administrador.';
/** Los intentos fallidos se cuentan por IP con el mismo límite que el inicio de sesión. */
const PAIRING_KEY = 'emparejamiento-de-pantalla';

/** Pantallas de sala (spec 005, HU-005-1). */
@Injectable()
export class ScreensService {
  private readonly revocations = new Subject<string>();
  /** Pantallas revocadas: la pasarela en tiempo real cierra su conexión (AC-005-04). */
  readonly revoked$: Observable<string> = this.revocations.asObservable();

  constructor(
    private readonly prisma: PrismaService,
    private readonly attempts: LoginAttemptsService,
  ) {}

  async list(actor: AuthUser): Promise<ScreenList> {
    const screens = await this.prisma.screen.findMany({
      where: { centerId: actor.centerId },
      orderBy: { createdAt: 'asc' },
    });
    return { items: screens.map(toDto) };
  }

  /** AC-005-01: alta de la pantalla con su primer código. */
  async create(actor: AuthUser, name: string): Promise<PairingCode> {
    const screen = await this.prisma.screen.create({ data: { centerId: actor.centerId, name } });
    return this.issueCode(screen);
  }

  /** Código nuevo para emparejar (o volver a emparejar). Anula los anteriores sin usar. */
  async newCode(actor: AuthUser, id: string): Promise<PairingCode> {
    return this.issueCode(await this.findInCenter(actor, id));
  }

  /** AC-005-04: el token deja de valer y se cierra la conexión de la pantalla. */
  async revoke(actor: AuthUser, id: string): Promise<ScreenDto> {
    await this.findInCenter(actor, id);
    const screen = await this.prisma.screen.update({
      where: { id },
      data: { tokenHash: null, revokedAt: new Date() },
    });
    this.revocations.next(id);
    return toDto(screen);
  }

  /** AC-005-02 y AC-005-03: canjea un código vigente por un token de dispositivo. */
  async pair(code: string, ip: string): Promise<PairScreenResponse> {
    if (this.attempts.isBlocked(ip, PAIRING_KEY)) {
      throw new HttpException(
        'Demasiados códigos incorrectos. Espera 15 minutos antes de volver a intentarlo.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const now = new Date();
    const pairing = await this.prisma.screenPairingCode.findUnique({
      where: { codeHash: hashOpaqueToken(code) },
      include: { screen: true },
    });
    if (!pairing || pairing.usedAt || pairing.expiresAt <= now) {
      this.attempts.registerFailure(ip, PAIRING_KEY);
      throw new BadRequestException(INVALID_CODE);
    }

    const token = generateOpaqueToken();
    // Marcar el código como usado solo si sigue libre evita que dos televisores lo canjeen a la vez.
    const claimed = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.screenPairingCode.updateMany({
        where: { id: pairing.id, usedAt: null },
        data: { usedAt: now },
      });
      if (count === 0) return false;
      await tx.screen.update({
        where: { id: pairing.screenId },
        data: { tokenHash: hashOpaqueToken(token), pairedAt: now, revokedAt: null },
      });
      return true;
    });
    if (!claimed) throw new BadRequestException(INVALID_CODE);

    this.attempts.reset(ip, PAIRING_KEY);
    // Si la pantalla ya estaba emparejada en otro televisor, ese deja de valer.
    this.revocations.next(pairing.screenId);
    return { token, screen: { id: pairing.screen.id, name: pairing.screen.name } };
  }

  /** Identifica una pantalla por su token. Null si no existe o está revocada. */
  async authenticate(token: string): Promise<AuthScreen | null> {
    const screen = await this.prisma.screen.findUnique({
      where: { tokenHash: hashOpaqueToken(token) },
    });
    if (!screen || screen.revokedAt) return null;
    await this.prisma.screen.update({ where: { id: screen.id }, data: { lastSeenAt: new Date() } });
    return { id: screen.id, name: screen.name, centerId: screen.centerId };
  }

  /** Nombre y zona horaria del centro para el modo de espera (AC-005-05). */
  async center(centerId: string): Promise<{ name: string; timezone: string }> {
    const center = await this.prisma.center.findUniqueOrThrow({
      where: { id: centerId },
      select: { name: true, timezone: true },
    });
    return center;
  }

  private async findInCenter(actor: AuthUser, id: string): Promise<Screen> {
    const screen = await this.prisma.screen.findFirst({ where: { id, centerId: actor.centerId } });
    if (!screen) throw new NotFoundException('Pantalla no encontrada.');
    return screen;
  }

  private async issueCode(screen: Screen): Promise<PairingCode> {
    const code = generatePairingCode();
    const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MINUTES * 60_000);
    await this.prisma.$transaction([
      this.prisma.screenPairingCode.updateMany({
        where: { screenId: screen.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.screenPairingCode.create({
        data: { screenId: screen.id, codeHash: hashOpaqueToken(code), expiresAt },
      }),
    ]);
    return { screen: toDto(screen), code, expiresAt: expiresAt.toISOString() };
  }
}

/** Código de 6 caracteres sin símbolos ambiguos, con un generador criptográfico. */
export function generatePairingCode(): string {
  return Array.from(
    { length: PAIRING_CODE_LENGTH },
    () => PAIRING_CODE_ALPHABET[randomInt(PAIRING_CODE_ALPHABET.length)],
  ).join('');
}

function toDto(screen: Screen): ScreenDto {
  return {
    id: screen.id,
    name: screen.name,
    status: screen.revokedAt ? 'REVOKED' : screen.tokenHash ? 'PAIRED' : 'PENDING',
    pairedAt: screen.pairedAt?.toISOString() ?? null,
    lastSeenAt: screen.lastSeenAt?.toISOString() ?? null,
    createdAt: screen.createdAt.toISOString(),
  };
}
