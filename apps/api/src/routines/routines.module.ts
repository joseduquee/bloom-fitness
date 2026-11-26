import { Module } from '@nestjs/common';
import { TemplatesModule } from '../templates/templates.module';
import { UsersModule } from '../users/users.module';
import { RoutinesController } from './routines.controller';
import { RoutinesService } from './routines.service';

/** Rutinas de los clientes (spec 003). */
@Module({
  imports: [UsersModule, TemplatesModule],
  controllers: [RoutinesController],
  providers: [RoutinesService],
  exports: [RoutinesService],
})
export class RoutinesModule {}
