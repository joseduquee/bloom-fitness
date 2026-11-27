import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ScreensController } from './screens.controller';
import { ScreensService } from './screens.service';

/** Pantallas de sala (spec 005). La pasarela en tiempo real usa el servicio para autenticarlas. */
@Module({
  imports: [AuthModule],
  controllers: [ScreensController],
  providers: [ScreensService],
  exports: [ScreensService],
})
export class ScreensModule {}
