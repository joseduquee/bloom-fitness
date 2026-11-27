import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import type { Env } from '../config/env';
import { AccessTokenVerifier } from './access-token.verifier';
import { ActivationTokensService } from './activation-tokens.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginAttemptsService } from './login-attempts.service';
import { PasswordService } from './password.service';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_ACCESS_SECRET', { infer: true }),
        signOptions: { algorithm: 'HS256' },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    LoginAttemptsService,
    ActivationTokensService,
    AccessTokenVerifier,
    // El orden importa: primero se autentica y después se comprueba el rol.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [
    AuthService,
    PasswordService,
    ActivationTokensService,
    AccessTokenVerifier,
    LoginAttemptsService,
    JwtModule,
  ],
})
export class AuthModule {}
