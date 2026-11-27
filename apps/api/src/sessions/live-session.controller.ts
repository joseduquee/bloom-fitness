import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  adjustExerciseRequestSchema,
  changeTemplateRequestSchema,
  liveSessionSchema,
  logSetRequestSchema,
  navigateRequestSchema,
  Role,
  setAttendanceRequestSchema,
  startPlanSchema,
  startSessionRequestSchema,
  type LiveSession,
  type StartPlan,
} from '@bloom/shared';
import type { z } from 'zod';
import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { openApiSchema } from '../common/openapi';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { LiveSessionService } from './live-session.service';

const uuid = new ParseUUIDPipe({ version: '4' });
const live = { schema: openApiSchema(liveSessionSchema) };

/**
 * Dirigir una sesión (spec 004, HU-004-2 a HU-004-4). Todas las escrituras devuelven la instantánea
 * completa. Solo el entrenador asignado o un administrador puede escribir (AC-004-09).
 */
@ApiTags('sesión en directo')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'No eres el entrenador asignado ni administrador.' })
@ApiConflictResponse({ description: 'La sesión no está en el estado necesario.' })
@Roles(Role.ADMIN, Role.TRAINER)
@Controller('sessions/:id')
export class LiveSessionController {
  constructor(private readonly live: LiveSessionService) {}

  @Get('live')
  @ApiOkResponse(live)
  snapshot(@CurrentUser() actor: AuthUser, @Param('id', uuid) id: string): Promise<LiveSession> {
    return this.live.snapshot(actor, id);
  }

  @Get('start-plan')
  @ApiOkResponse({ schema: openApiSchema(startPlanSchema) })
  startPlan(@CurrentUser() actor: AuthUser, @Param('id', uuid) id: string): Promise<StartPlan> {
    return this.live.startPlan(actor, id);
  }

  @Post('start')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ schema: openApiSchema(startSessionRequestSchema, 'input') })
  @ApiOkResponse(live)
  start(
    @CurrentUser() actor: AuthUser,
    @Param('id', uuid) id: string,
    @Body(new ZodValidationPipe(startSessionRequestSchema))
    body: z.output<typeof startSessionRequestSchema>,
  ): Promise<LiveSession> {
    return this.live.start(actor, id, body);
  }

  @Put('attendees/:clientId/template')
  @ApiBody({ schema: openApiSchema(changeTemplateRequestSchema, 'input') })
  @ApiOkResponse(live)
  changeTemplate(
    @CurrentUser() actor: AuthUser,
    @Param('id', uuid) id: string,
    @Param('clientId', uuid) clientId: string,
    @Body(new ZodValidationPipe(changeTemplateRequestSchema))
    body: z.output<typeof changeTemplateRequestSchema>,
  ): Promise<LiveSession> {
    return this.live.changeTemplate(actor, id, clientId, body.templateId);
  }

  @Put('attendees/:clientId/attendance')
  @ApiBody({ schema: openApiSchema(setAttendanceRequestSchema, 'input') })
  @ApiOkResponse(live)
  setAttendance(
    @CurrentUser() actor: AuthUser,
    @Param('id', uuid) id: string,
    @Param('clientId', uuid) clientId: string,
    @Body(new ZodValidationPipe(setAttendanceRequestSchema))
    body: z.output<typeof setAttendanceRequestSchema>,
  ): Promise<LiveSession> {
    return this.live.setAttendance(actor, id, clientId, body);
  }

  @Post('attendees/:clientId/navigate')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ schema: openApiSchema(navigateRequestSchema, 'input') })
  @ApiOkResponse(live)
  navigate(
    @CurrentUser() actor: AuthUser,
    @Param('id', uuid) id: string,
    @Param('clientId', uuid) clientId: string,
    @Body(new ZodValidationPipe(navigateRequestSchema))
    body: z.output<typeof navigateRequestSchema>,
  ): Promise<LiveSession> {
    return this.live.navigate(actor, id, clientId, body);
  }

  @Put('attendees/:clientId/exercises/:position/sets/:setNumber')
  @ApiBody({ schema: openApiSchema(logSetRequestSchema, 'input') })
  @ApiOkResponse(live)
  logSet(
    @CurrentUser() actor: AuthUser,
    @Param('id', uuid) id: string,
    @Param('clientId', uuid) clientId: string,
    @Param('position', ParseIntPipe) position: number,
    @Param('setNumber', ParseIntPipe) setNumber: number,
    @Body(new ZodValidationPipe(logSetRequestSchema))
    body: z.output<typeof logSetRequestSchema>,
  ): Promise<LiveSession> {
    return this.live.logSet(actor, id, clientId, position, setNumber, body);
  }

  @Patch('attendees/:clientId/exercises/:position')
  @ApiBody({ schema: openApiSchema(adjustExerciseRequestSchema, 'input') })
  @ApiOkResponse(live)
  adjustExercise(
    @CurrentUser() actor: AuthUser,
    @Param('id', uuid) id: string,
    @Param('clientId', uuid) clientId: string,
    @Param('position', ParseIntPipe) position: number,
    @Body(new ZodValidationPipe(adjustExerciseRequestSchema))
    body: z.output<typeof adjustExerciseRequestSchema>,
  ): Promise<LiveSession> {
    return this.live.adjustExercise(actor, id, clientId, position, body);
  }

  @Post('finish')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse(live)
  finish(@CurrentUser() actor: AuthUser, @Param('id', uuid) id: string): Promise<LiveSession> {
    return this.live.finish(actor, id);
  }
}
