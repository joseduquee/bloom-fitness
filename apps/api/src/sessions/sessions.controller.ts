import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import {
  listSessionsQuerySchema,
  Role,
  saveSessionRequestSchema,
  sessionListSchema,
  trainingSessionSchema,
  type SessionList,
  type TrainingSession,
} from '@bloom/shared';
import type { z } from 'zod';
import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { openApiSchema } from '../common/openapi';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { SessionsService } from './sessions.service';

const uuid = new ParseUUIDPipe({ version: '4' });

/** Planificación de sesiones (spec 004, HU-004-1). */
@ApiTags('sesiones')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.TRAINER)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Get()
  @ApiOkResponse({ schema: openApiSchema(sessionListSchema) })
  list(
    @CurrentUser() actor: AuthUser,
    @Query(new ZodValidationPipe(listSessionsQuerySchema))
    query: z.output<typeof listSessionsQuerySchema>,
  ): Promise<SessionList> {
    return this.sessions.list(actor, query);
  }

  @Get(':id')
  @ApiOkResponse({ schema: openApiSchema(trainingSessionSchema) })
  get(@CurrentUser() actor: AuthUser, @Param('id', uuid) id: string): Promise<TrainingSession> {
    return this.sessions.get(actor, id);
  }

  @Post()
  @ApiBody({ schema: openApiSchema(saveSessionRequestSchema, 'input') })
  @ApiCreatedResponse({ schema: openApiSchema(trainingSessionSchema) })
  @ApiConflictResponse({ description: 'Algún cliente ya tiene otra sesión en ese horario.' })
  @ApiUnprocessableEntityResponse({
    description: 'Capacidad superada, asistente o entrenador no válido.',
  })
  create(
    @CurrentUser() actor: AuthUser,
    @Body(new ZodValidationPipe(saveSessionRequestSchema))
    body: z.output<typeof saveSessionRequestSchema>,
  ): Promise<TrainingSession> {
    return this.sessions.create(actor, body);
  }

  @Put(':id')
  @ApiBody({ schema: openApiSchema(saveSessionRequestSchema, 'input') })
  @ApiOkResponse({ schema: openApiSchema(trainingSessionSchema) })
  @ApiForbiddenResponse({ description: 'No eres el entrenador asignado ni administrador.' })
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id', uuid) id: string,
    @Body(new ZodValidationPipe(saveSessionRequestSchema))
    body: z.output<typeof saveSessionRequestSchema>,
  ): Promise<TrainingSession> {
    return this.sessions.update(actor, id, body);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: openApiSchema(trainingSessionSchema) })
  cancel(@CurrentUser() actor: AuthUser, @Param('id', uuid) id: string): Promise<TrainingSession> {
    return this.sessions.cancel(actor, id);
  }
}
