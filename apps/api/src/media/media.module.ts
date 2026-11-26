import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolve } from 'node:path';
import type { Env } from '../config/env';
import { LocalDiskMediaStorage } from './local-disk-media-storage';
import { MEDIA_STORAGE, type MediaStorage } from './media-storage';

/** Almacenamiento de archivos públicos (spec 003). */
@Global()
@Module({
  providers: [
    {
      provide: MEDIA_STORAGE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): MediaStorage =>
        new LocalDiskMediaStorage(
          resolve(config.get('MEDIA_DIR', { infer: true })),
          config.get('MEDIA_PUBLIC_URL', { infer: true }),
        ),
    },
  ],
  exports: [MEDIA_STORAGE],
})
export class MediaModule {}
