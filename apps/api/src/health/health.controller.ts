import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import type { HealthResponse } from '@bloom/shared';
import type { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import type { Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Comprobación de salud usada por el balanceador y por ECS para decidir si una tarea
 * puede recibir tráfico (AC-000-07). Devuelve 503 si la base de datos no responde.
 */
@ApiTags('salud')
@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'El API y la base de datos responden.' })
  @ApiServiceUnavailableResponse({ description: 'La base de datos no responde.' })
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthResponse> {
    const databaseUp = await this.prisma.isHealthy();
    if (!databaseUp) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return {
      status: databaseUp ? 'ok' : 'degraded',
      version: this.config.get('APP_VERSION', { infer: true }),
      uptimeSeconds: Math.round(process.uptime()),
      database: databaseUp ? 'up' : 'down',
    };
  }
}
