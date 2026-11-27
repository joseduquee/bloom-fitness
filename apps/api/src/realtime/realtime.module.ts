import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SessionsModule } from '../sessions/sessions.module';
import { LiveGateway } from './live.gateway';

/** Canal en tiempo real (spec 004, PR C). */
@Module({
  imports: [AuthModule, SessionsModule],
  providers: [LiveGateway],
})
export class RealtimeModule {}
