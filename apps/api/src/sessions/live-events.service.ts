import { Injectable } from '@nestjs/common';
import type { LiveSession } from '@bloom/shared';
import { Subject, type Observable } from 'rxjs';

export interface LiveSessionEvent {
  centerId: string;
  snapshot: LiveSession;
}

/**
 * Bus interno de cambios de sesión. El servicio publica y la pasarela en tiempo real escucha,
 * así la lógica de la sesión no depende de Socket.IO. Las escrituras siguen entrando solo por REST
 * (constitución §2.5).
 */
@Injectable()
export class LiveEventsService {
  private readonly changes = new Subject<LiveSessionEvent>();

  readonly changes$: Observable<LiveSessionEvent> = this.changes.asObservable();

  publish(centerId: string, snapshot: LiveSession): void {
    this.changes.next({ centerId, snapshot });
  }
}
