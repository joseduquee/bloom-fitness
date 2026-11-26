import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiBody,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  activateAccountRequestSchema,
  loginRequestSchema,
  sessionResponseSchema,
  sessionUserSchema,
  type SessionResponse,
  type SessionUser,
} from '@bloom/shared';
import type { CookieOptions, Request, Response } from 'express';
import type { z } from 'zod';
import { openApiSchema } from '../common/openapi';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import type { Env } from '../config/env';
import type { AuthUser } from './auth-user';
import { AuthService, type IssuedSession } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';

export const REFRESH_COOKIE = 'bloom_rt';

@ApiTags('autenticación')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ schema: openApiSchema(loginRequestSchema, 'input') })
  @ApiOkResponse({ schema: openApiSchema(sessionResponseSchema) })
  @ApiUnauthorizedResponse({ description: 'Credenciales incorrectas o usuario desactivado.' })
  @ApiTooManyRequestsResponse({ description: 'Demasiados intentos fallidos.' })
  async login(
    @Body(new ZodValidationPipe(loginRequestSchema)) body: z.output<typeof loginRequestSchema>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionResponse> {
    const session = await this.auth.login(body.email, body.password, req.ip ?? 'desconocida');
    return this.sendSession(res, session);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: openApiSchema(sessionResponseSchema) })
  @ApiUnauthorizedResponse({ description: 'No hay sesión o el token no es válido.' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionResponse> {
    try {
      const session = await this.auth.refresh(this.readRefreshCookie(req));
      return this.sendSession(res, session);
    } catch (error) {
      res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
      throw error;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Sesión cerrada.' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(this.readRefreshCookie(req));
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }

  @Public()
  @Post('activate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBody({ schema: openApiSchema(activateAccountRequestSchema, 'input') })
  @ApiNoContentResponse({ description: 'Contraseña establecida. Ya se puede iniciar sesión.' })
  async activate(
    @Body(new ZodValidationPipe(activateAccountRequestSchema))
    body: z.output<typeof activateAccountRequestSchema>,
  ): Promise<void> {
    await this.auth.activate(body);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOkResponse({ schema: openApiSchema(sessionUserSchema) })
  me(@CurrentUser() user: AuthUser): Promise<SessionUser> {
    return this.auth.me(user.id);
  }

  private sendSession(res: Response, session: IssuedSession): SessionResponse {
    res.cookie(REFRESH_COOKIE, session.refreshToken, {
      ...this.cookieOptions(),
      expires: session.refreshExpiresAt,
    });
    return session.body;
  }

  private readRefreshCookie(req: Request): string | undefined {
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    return cookies?.[REFRESH_COOKIE];
  }

  /** Cookie solo accesible por el servidor y únicamente en las rutas /auth (AC-001-01). */
  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.get('NODE_ENV', { infer: true }) === 'production',
      sameSite: 'strict',
      path: '/auth',
    };
  }
}
