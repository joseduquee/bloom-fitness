import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { Server, ServerOptions } from 'socket.io';

/** Socket.IO con los mismos orígenes permitidos que la API REST (CORS_ORIGINS). */
export class LiveIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly origins: string[],
  ) {
    super(app);
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    return super.createIOServer(port, {
      ...(options as ServerOptions),
      cors: { origin: this.origins, credentials: true },
      // Reconexión rápida tras cortes breves: el ping detecta en ~10 s una conexión muerta.
      pingInterval: 5_000,
      pingTimeout: 5_000,
    }) as Server;
  }
}
