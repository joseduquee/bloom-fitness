import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { resolve } from 'node:path';
import { Logger } from 'nestjs-pino';
import { HttpExceptionFilter } from './common/http-exception.filter';
import type { Env } from './config/env';

/**
 * Configuración común de la aplicación. Se usa en `main.ts` y en las pruebas de integración,
 * para que ambas arranquen el API exactamente igual.
 */
export function configureApp(app: INestApplication): INestApplication {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.useLogger(app.get(Logger));
  // Detrás del balanceador, la IP real del cliente llega en X-Forwarded-For.
  (app as NestExpressApplication).set('trust proxy', 1);
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: config.get('CORS_ORIGINS', { infer: true }), credentials: true });
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();

  // GIF de los ejercicios guardados en disco (spec 003). La web y las pantallas de sala los cargan desde
  // otro origen, por eso se permite su uso entre orígenes. En AWS los serviría CloudFront.
  (app as NestExpressApplication).useStaticAssets(
    resolve(config.get('MEDIA_DIR', { infer: true })),
    {
      prefix: '/media/',
      index: false,
      setHeaders: (res) => {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Cache-Control', 'public, max-age=86400');
      },
    },
  );

  const openApi = new DocumentBuilder()
    .setTitle('Bloom Fitness API')
    .setDescription(
      'API REST de Bloom Fitness. Los eventos en tiempo real se documentan en specs/004.',
    )
    .setVersion(config.get('APP_VERSION', { infer: true }))
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, openApi));

  return app;
}
