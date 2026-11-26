import {
  Body,
  Controller,
  Delete,
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
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import {
  listTemplatesQuerySchema,
  Role,
  saveTemplateRequestSchema,
  workoutTemplateListSchema,
  workoutTemplateSchema,
  type WorkoutTemplate,
  type WorkoutTemplateList,
} from '@bloom/shared';
import type { z } from 'zod';
import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { openApiSchema } from '../common/openapi';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { TemplatesService } from './templates.service';

const uuid = new ParseUUIDPipe({ version: '4' });

/** Plantillas de entrenamiento (spec 003, HU-003-2). */
@ApiTags('plantillas')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.TRAINER)
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Get()
  @ApiOkResponse({ schema: openApiSchema(workoutTemplateListSchema) })
  list(
    @CurrentUser() actor: AuthUser,
    @Query(new ZodValidationPipe(listTemplatesQuerySchema))
    query: z.output<typeof listTemplatesQuerySchema>,
  ): Promise<WorkoutTemplateList> {
    return this.templates.list(actor, query);
  }

  @Get(':id')
  @ApiOkResponse({ schema: openApiSchema(workoutTemplateSchema) })
  @ApiNotFoundResponse({ description: 'No existe en tu centro.' })
  get(@CurrentUser() actor: AuthUser, @Param('id', uuid) id: string): Promise<WorkoutTemplate> {
    return this.templates.get(actor, id);
  }

  @Post()
  @ApiBody({ schema: openApiSchema(saveTemplateRequestSchema, 'input') })
  @ApiCreatedResponse({ schema: openApiSchema(workoutTemplateSchema) })
  @ApiUnprocessableEntityResponse({ description: 'Ejercicio inexistente o desactivado.' })
  create(
    @CurrentUser() actor: AuthUser,
    @Body(new ZodValidationPipe(saveTemplateRequestSchema))
    body: z.output<typeof saveTemplateRequestSchema>,
  ): Promise<WorkoutTemplate> {
    return this.templates.create(actor, body);
  }

  @Put(':id')
  @ApiBody({ schema: openApiSchema(saveTemplateRequestSchema, 'input') })
  @ApiOkResponse({ schema: openApiSchema(workoutTemplateSchema) })
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id', uuid) id: string,
    @Body(new ZodValidationPipe(saveTemplateRequestSchema))
    body: z.output<typeof saveTemplateRequestSchema>,
  ): Promise<WorkoutTemplate> {
    return this.templates.update(actor, id, body);
  }

  @Post(':id/duplicate')
  @ApiCreatedResponse({ schema: openApiSchema(workoutTemplateSchema) })
  duplicate(
    @CurrentUser() actor: AuthUser,
    @Param('id', uuid) id: string,
  ): Promise<WorkoutTemplate> {
    return this.templates.duplicate(actor, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiConflictResponse({ description: 'La plantilla se usa en alguna rutina.' })
  remove(@CurrentUser() actor: AuthUser, @Param('id', uuid) id: string): Promise<void> {
    return this.templates.remove(actor, id);
  }
}
