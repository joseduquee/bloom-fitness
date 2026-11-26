import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

/** Sesiones de entrenamiento (spec 004). */
@Module({
  imports: [UsersModule],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
