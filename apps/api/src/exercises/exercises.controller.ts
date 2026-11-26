import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnsupportedMediaTypeResponse,
} from '@nestjs/swagger';
import {
  createExerciseRequestSchema,
  exerciseListSchema,
  exerciseSchema,
  listExercisesQuerySchema,
  Role,
  updateExerciseRequestSchema,
  type Exercise,
  type ExerciseList,
} from '@bloom/shared';
import type { z } from 'zod';
import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { openApiSchema } from '../common/openapi';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ExercisesService } from './exercises.service';
import { GifUploadInterceptor, type UploadedGif } from './gif-upload.interceptor';

const uuid = new ParseUUIDPipe({ version: '4' });

/** Catálogo de ejercicios del centro (spec 003, HU-003-1). */
@ApiTags('ejercicios')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.TRAINER)
@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercises: ExercisesService) {}

  @Get()
  @ApiOkResponse({ schema: openApiSchema(exerciseListSchema) })
  list(
    @CurrentUser() actor: AuthUser,
    @Query(new ZodValidationPipe(listExercisesQuerySchema))
    query: z.output<typeof listExercisesQuerySchema>,
  ): Promise<ExerciseList> {
    return this.exercises.list(actor, query);
  }

  @Get(':id')
  @ApiOkResponse({ schema: openApiSchema(exerciseSchema) })
  @ApiNotFoundResponse({ description: 'No existe en tu centro.' })
  get(@CurrentUser() actor: AuthUser, @Param('id', uuid) id: string): Promise<Exercise> {
    return this.exercises.get(actor, id);
  }

  @Post()
  @ApiBody({ schema: openApiSchema(createExerciseRequestSchema, 'input') })
  @ApiCreatedResponse({ schema: openApiSchema(exerciseSchema) })
  @ApiConflictResponse({ description: 'Ya existe un ejercicio con ese nombre.' })
  create(
    @CurrentUser() actor: AuthUser,
    @Body(new ZodValidationPipe(createExerciseRequestSchema))
    body: z.output<typeof createExerciseRequestSchema>,
  ): Promise<Exercise> {
    return this.exercises.create(actor, body);
  }

  @Patch(':id')
  @ApiBody({ schema: openApiSchema(updateExerciseRequestSchema, 'input') })
  @ApiOkResponse({ schema: openApiSchema(exerciseSchema) })
  @ApiConflictResponse({ description: 'Ya existe un ejercicio con ese nombre.' })
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id', uuid) id: string,
    @Body(new ZodValidationPipe(updateExerciseRequestSchema))
    body: z.output<typeof updateExerciseRequestSchema>,
  ): Promise<Exercise> {
    return this.exercises.update(actor, id, body);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: openApiSchema(exerciseSchema) })
  deactivate(@CurrentUser() actor: AuthUser, @Param('id', uuid) id: string): Promise<Exercise> {
    return this.exercises.setActive(actor, id, false);
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: openApiSchema(exerciseSchema) })
  reactivate(@CurrentUser() actor: AuthUser, @Param('id', uuid) id: string): Promise<Exercise> {
    return this.exercises.setActive(actor, id, true);
  }

  @Put(':id/media')
  @UseInterceptors(GifUploadInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'GIF de 5 MB como máximo' },
      },
    },
  })
  @ApiOkResponse({ schema: openApiSchema(exerciseSchema) })
  @ApiPayloadTooLargeResponse({ description: 'El GIF supera 5 MB.' })
  @ApiUnsupportedMediaTypeResponse({ description: 'El archivo no es un GIF.' })
  setMedia(
    @CurrentUser() actor: AuthUser,
    @Param('id', uuid) id: string,
    @UploadedFile() file: UploadedGif | undefined,
  ): Promise<Exercise> {
    return this.exercises.setMedia(actor, id, file);
  }

  @Delete(':id/media')
  @ApiOkResponse({ schema: openApiSchema(exerciseSchema) })
  removeMedia(@CurrentUser() actor: AuthUser, @Param('id', uuid) id: string): Promise<Exercise> {
    return this.exercises.removeMedia(actor, id);
  }
}
