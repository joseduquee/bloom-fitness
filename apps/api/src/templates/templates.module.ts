import { Module } from '@nestjs/common';
import { ExercisesModule } from '../exercises/exercises.module';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';

/** Plantillas (spec 003). Exporta el servicio para las rutinas y, más adelante, las sesiones. */
@Module({
  imports: [ExercisesModule],
  controllers: [TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
