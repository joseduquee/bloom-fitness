import { Logger, type OnModuleDestroy } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  type OnGatewayConnection,
  type OnGatewayInit,
} from '@nestjs/websockets';
import {
  LIVE_NAMESPACE,
  LiveEvents,
  Role,
  subscribeRequestSchema,
  toScreenSession,
  type ScreenState,
  type SubscribeAck,
} from '@bloom/shared';
import type { Subscription } from 'rxjs';
import type { Namespace, Socket } from 'socket.io';
import { AccessTokenVerifier } from '../auth/access-token.verifier';
import type { AuthUser } from '../auth/auth-user';
import { ScreensService, type AuthScreen } from '../screens/screens.service';
import { LiveEventsService } from '../sessions/live-events.service';
import { LiveSessionService } from '../sessions/live-session.service';

/** Quien se conecta: un usuario del personal o una pantalla emparejada (nunca los dos). */
interface LiveSocketData {
  user?: AuthUser;
  screen?: AuthScreen;
}
type LiveSocket = Socket & { data: LiveSocketData };

const sessionRoom = (id: string) => `session:${id}`;
const screenRoom = (id: string) => `screen:${id}`;
/** Todas las pantallas emparejadas de un centro (spec 005). */
const centerScreensRoom = (centerId: string) => `screens:${centerId}`;
const STAFF: readonly string[] = [Role.ADMIN, Role.TRAINER];

/**
 * Canal en tiempo real de las sesiones (spec 004, PR C). Solo difunde estado: las escrituras
 * entran por REST (constitución §2.5) y aquí llegan como instantáneas ya guardadas.
 */
@WebSocketGateway({ namespace: LIVE_NAMESPACE })
export class LiveGateway
  implements OnGatewayInit<Namespace>, OnGatewayConnection<LiveSocket>, OnModuleDestroy
{
  private readonly logger = new Logger(LiveGateway.name);
  private readonly subscriptions: Subscription[] = [];

  constructor(
    private readonly verifier: AccessTokenVerifier,
    private readonly live: LiveSessionService,
    private readonly events: LiveEventsService,
    private readonly screens: ScreensService,
  ) {}

  afterInit(server: Namespace): void {
    // AC-004-16: sin un token válido de personal o de pantalla no hay conexión (constitución §3.3).
    server.use((socket, next) => {
      const auth = socket.handshake.auth as { token?: unknown; screenToken?: unknown };
      if (typeof auth.screenToken === 'string') {
        this.screens
          .authenticate(auth.screenToken)
          .then((screen) => {
            if (!screen) {
              next(new Error('Pantalla no autorizada. Vuelve a emparejarla.'));
              return;
            }
            (socket as LiveSocket).data.screen = screen;
            next();
          })
          .catch(() => next(new Error('Pantalla no autorizada. Vuelve a emparejarla.')));
        return;
      }
      const token = auth.token;
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

    // AC-004-15: cada cambio guardado se reenvía a quien sigue esa sesión y a las pantallas del centro.
    this.subscriptions.push(
      this.events.changes$.subscribe(({ centerId, snapshot }) => {
        const screen = toScreenSession(snapshot);
        server.to(sessionRoom(snapshot.id)).emit(LiveEvents.sessionUpdated, snapshot);
        server.to(screenRoom(snapshot.id)).emit(LiveEvents.screenSession, screen);
        server.to(centerScreensRoom(centerId)).emit(LiveEvents.screenSession, screen);
      }),
      // AC-005-04: al revocar una pantalla se cierra su conexión.
      this.screens.revoked$.subscribe((screenId) => {
        for (const socket of server.sockets.values()) {
          if ((socket as LiveSocket).data.screen?.id === screenId) socket.disconnect(true);
        }
      }),
    );
  }

  /** Una pantalla recibe al conectar el centro y las sesiones en curso (AC-005-05, AC-005-06). */
  async handleConnection(socket: LiveSocket): Promise<void> {
    const screen = socket.data.screen;
    if (!screen) return;
    await socket.join(centerScreensRoom(screen.centerId));
    const state: ScreenState = {
      screen: { id: screen.id, name: screen.name },
      center: await this.screens.center(screen.centerId),
      sessions: await this.live.screenSessions(screen.centerId),
    };
    socket.emit(LiveEvents.screenState, state);
  }

  onModuleDestroy(): void {
    for (const subscription of this.subscriptions) subscription.unsubscribe();
  }

  /** El panel se suscribe: recibe la instantánea completa y después cada cambio. */
  @SubscribeMessage(LiveEvents.sessionSubscribe)
  async subscribeSession(
    @ConnectedSocket() socket: LiveSocket,
    @MessageBody() body: unknown,
  ): Promise<SubscribeAck> {
    return this.join(socket, body, async (user, sessionId) => {
      const snapshot = await this.live.snapshot(user, sessionId);
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

  /** AC-004-18: proyección para pantallas, sin datos personales, para previsualizarla desde el panel. */
  @SubscribeMessage(LiveEvents.screenSubscribe)
  async subscribeScreen(
    @ConnectedSocket() socket: LiveSocket,
    @MessageBody() body: unknown,
  ): Promise<SubscribeAck> {
    return this.join(socket, body, async (user, sessionId) => {
      const snapshot = await this.live.snapshot(user, sessionId);
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
    subscribe: (user: AuthUser, sessionId: string) => Promise<void>,
  ): Promise<SubscribeAck> {
    // Las pantallas no eligen sesión: reciben las de su centro sin suscribirse.
    const user = socket.data.user;
    if (!user) return { ok: false, error: 'No permitido.' };
    const parsed = subscribeRequestSchema.safeParse(body);
    if (!parsed.success) return { ok: false, error: 'Petición no válida.' };
    try {
      await subscribe(user, parsed.data.sessionId);
      return { ok: true };
    } catch (error) {
      this.logger.debug({ err: error, sessionId: parsed.data.sessionId }, 'Suscripción rechazada');
      return { ok: false, error: 'Sesión no encontrada.' };
    }
  }
}
