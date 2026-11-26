import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { generateOpaqueToken, hashOpaqueToken } from './opaque-token';

const ACTIVATION_TTL_MS = 72 * 60 * 60 * 1000;

export interface ActivationLink {
  activationUrl: string;
  expiresAt: Date;
}

/** Enlaces de un solo uso para que un usuario fije su contraseña (AC-001-10, AC-001-16). */
@Injectable()
export class ActivationTokensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** Crea un enlace nuevo e invalida los anteriores del mismo usuario. */
  async issue(userId: string): Promise<ActivationLink> {
    const token = generateOpaqueToken();
    const expiresAt = new Date(Date.now() + ACTIVATION_TTL_MS);
    await this.prisma.$transaction([
      this.prisma.activationToken.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.activationToken.create({
        data: { userId, tokenHash: hashOpaqueToken(token), expiresAt },
      }),
    ]);
    const url = new URL('/activar', this.config.get('WEB_URL', { infer: true }));
    url.searchParams.set('token', token);
    return { activationUrl: url.toString(), expiresAt };
  }
}
