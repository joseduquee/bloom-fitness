import { Module } from '@nestjs/common';
import { ExercisesModule } from '../exercises/exercises.module';
import { RoutinesModule } from '../routines/routines.module';
import { TemplatesModule } from '../templates/templates.module';
import { UsersModule } from '../users/users.module';
import { LiveSessionController } from './live-session.controller';
import { LiveSessionService } from './live-session.service';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

/** Sesiones de entrenamiento (spec 004): planificación y dirección en directo. */
@Module({
  imports: [UsersModule, RoutinesModule, TemplatesModule, ExercisesModule],
  controllers: [SessionsController, LiveSessionController],
  providers: [SessionsService, LiveSessionService],
  exports: [SessionsService, LiveSessionService],
})
export class SessionsModule {}
