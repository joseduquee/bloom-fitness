import {
  Injectable,
  PayloadTooLargeException,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EXERCISE_MEDIA_MAX_BYTES } from '@bloom/shared';
import type { Observable } from 'rxjs';

const MulterInterceptor = FileInterceptor('file', {
  // El límite se aplica al recibir el archivo: uno mayor no llega a cargarse entero en memoria.
  limits: { fileSize: EXERCISE_MEDIA_MAX_BYTES, files: 1 },
});

/** Recibe el GIF de un ejercicio y traduce al español el error de tamaño (AC-003-02). */
@Injectable()
export class GifUploadInterceptor implements NestInterceptor {
  private readonly multer: NestInterceptor = new MulterInterceptor();

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    try {
      return await this.multer.intercept(context, next);
    } catch (error) {
      if (error instanceof PayloadTooLargeException) {
        throw new PayloadTooLargeException('El GIF no puede superar 5 MB.');
      }
      throw error;
    }
  }
}

/** Datos del archivo recibido que usa el controlador. */
export interface UploadedGif {
  buffer: Buffer;
  size: number;
}
