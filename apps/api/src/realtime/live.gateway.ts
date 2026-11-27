import { Logger, type OnModuleDestroy } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  type OnGatewayInit,
} from '@nestjs/websockets';
import {
  LIVE_NAMESPACE,
  LiveEvents,
  Role,
  subscribeRequestSchema,
  toScreenSession,
  type SubscribeAck,
} from '@bloom/shared';
import type { Subscription } from 'rxjs';
import type { Namespace, Socket } from 'socket.io';
import { AccessTokenVerifier } from '../auth/access-token.verifier';
import type { AuthUser } from '../auth/auth-user';
import { LiveEventsService } from '../sessions/live-events.service';
import { LiveSessionService } from '../sessions/live-session.service';

interface LiveSocketData {
  user: AuthUser;
}
type LiveSocket = Socket & { data: LiveSocketData };

const sessionRoom = (id: string) => `session:${id}`;
const screenRoom = (id: string) => `screen:${id}`;
const STAFF: readonly string[] = [Role.ADMIN, Role.TRAINER];

/**
 * Canal en tiempo real de las sesiones (spec 004, PR C). Solo difunde estado: las escrituras
 * entran por REST (constitución §2.5) y aquí llegan como instantáneas ya guardadas.
 */
@WebSocketGateway({ namespace: LIVE_NAMESPACE })
export class LiveGateway implements OnGatewayInit<Namespace>, OnModuleDestroy {
  private readonly logger = new Logger(LiveGateway.name);
  private subscription?: Subscription;

  constructor(
    private readonly verifier: AccessTokenVerifier,
    private readonly live: LiveSessionService,
    private readonly events: LiveEventsService,
  ) {}

  afterInit(server: Namespace): void {
    // AC-004-16: sin un token válido de entrenador o administrador no hay conexión.
    server.use((socket, next) => {
      const token = (socket.handshake.auth as { token?: unknown }).token;
      this.verifier
        .verify(typeof token === 'string' ? token : undefined)
        .then((user) => {
          if (!STAFF.includes(user.role)) {
            next(new Error('No tienes acceso al canal en tiempo real.'));
            return;
          }
          (socket as LiveSocket).data.user = user;
          next();
        })
        .catch((error: unknown) =>
          next(new Error(error instanceof Error ? error.message : 'No autorizado.')),
        );
    });

    // AC-004-15: cada cambio guardado se reenvía a quien sigue esa sesión.
    this.subscription = this.events.changes$.subscribe(({ snapshot }) => {
      server.to(sessionRoom(snapshot.id)).emit(LiveEvents.sessionUpdated, snapshot);
      server.to(screenRoom(snapshot.id)).emit(LiveEvents.screenSession, toScreenSession(snapshot));
    });
  }

  onModuleDestroy(): void {
    this.subscription?.unsubscribe();
  }

  /** El panel se suscribe: recibe la instantánea completa y después cada cambio. */
  @SubscribeMessage(LiveEvents.sessionSubscribe)
  async subscribeSession(
    @ConnectedSocket() socket: LiveSocket,
    @MessageBody() body: unknown,
  ): Promise<SubscribeAck> {
    return this.join(socket, body, async (sessionId) => {
      const snapshot = await this.live.snapshot(socket.data.user, sessionId);
      await socket.join(sessionRoom(sessionId));
      socket.emit(LiveEvents.sessionSnapshot, snapshot);
    });
  }

  @SubscribeMessage(LiveEvents.sessionUnsubscribe)
  async unsubscribeSession(
    @ConnectedSocket() socket: LiveSocket,
    @MessageBody() body: unknown,
  ): Promise<SubscribeAck> {
    const parsed = subscribeRequestSchema.safeParse(body);
    if (!parsed.success) return { ok: false, error: 'Petición no válida.' };
    await socket.leave(sessionRoom(parsed.data.sessionId));
    return { ok: true };
  }

  /** AC-004-18: proyección para pantallas, sin datos personales. La spec 005 la abre a las pantallas emparejadas. */
  @SubscribeMessage(LiveEvents.screenSubscribe)
  async subscribeScreen(
    @ConnectedSocket() socket: LiveSocket,
    @MessageBody() body: unknown,
  ): Promise<SubscribeAck> {
    return this.join(socket, body, async (sessionId) => {
      const snapshot = await this.live.snapshot(socket.data.user, sessionId);
      await socket.join(screenRoom(sessionId));
      socket.emit(LiveEvents.screenSession, toScreenSession(snapshot));
    });
  }

  /**
   * AC-004-17: la instantánea se pide con el centro de quien se conecta, así que una sesión
   * de otro centro no existe para él y nunca entra en su sala.
   */
  private async join(
    socket: LiveSocket,
    body: unknown,
    subscribe: (sessionId: string) => Promise<void>,
  ): Promise<SubscribeAck> {
    const parsed = subscribeRequestSchema.safeParse(body);
    if (!parsed.success) return { ok: false, error: 'Petición no válida.' };
    try {
      await subscribe(parsed.data.sessionId);
      return { ok: true };
    } catch (error) {
      this.logger.debug({ err: error, sessionId: parsed.data.sessionId }, 'Suscripción rechazada');
      return { ok: false, error: 'Sesión no encontrada.' };
    }
  }
}
