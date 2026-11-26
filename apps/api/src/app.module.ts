import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module';
import { validateEnv, type Env } from './config/env';
import { HealthModule } from './health/health.module';
import { ExercisesModule } from './exercises/exercises.module';
import { MediaModule } from './media/media.module';
import { MembersModule } from './members/members.module';
import { RoutinesModule } from './routines/routines.module';
import { SessionsModule } from './sessions/sessions.module';
import { TemplatesModule } from './templates/templates.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv, cache: true }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL', { infer: true }),
          transport:
            config.get('NODE_ENV', { infer: true }) === 'development'
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
          // Nunca se registran cabeceras con credenciales.
          redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
          autoLogging: { ignore: (req) => req.url === '/health' },
        },
      }),
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    MembersModule,
    MediaModule,
    ExercisesModule,
    TemplatesModule,
    RoutinesModule,
    SessionsModule,
  ],
})
export class AppModule {}
