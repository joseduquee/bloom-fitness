import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ApiError } from '@bloom/shared';
import type { Response } from 'express';

/**
 * Convierte cualquier error en el formato único `ApiError` del paquete compartido.
 * Los errores no controlados se registran y se devuelven como 500 sin detalles internos.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const payload: ApiError =
        typeof body === 'object' && body !== null && 'message' in body
          ? {
              statusCode: status,
              error: String((body as { error?: string }).error ?? exception.name),
              message: String((body as { message: unknown }).message),
              details: (body as ApiError).details,
            }
          : { statusCode: status, error: exception.name, message: String(body) };
      response.status(status).json(payload);
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    const payload: ApiError = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Se ha producido un error inesperado.',
    };
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(payload);
  }
}
