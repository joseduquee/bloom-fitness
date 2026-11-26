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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import {
  createRoutineRequestSchema,
  Role,
  routineListSchema,
  routineSchema,
  saveRoutineRequestSchema,
  type Routine,
  type RoutineList,
} from '@bloom/shared';
import type { z } from 'zod';
import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { openApiSchema } from '../common/openapi';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { RoutinesService } from './routines.service';

const uuid = new ParseUUIDPipe({ version: '4' });

/** Rutinas de los clientes (spec 003, HU-003-3). */
@ApiTags('rutinas')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.TRAINER)
@Controller()
export class RoutinesController {
  constructor(private readonly routines: RoutinesService) {}

  @Get('clients/:clientId/routines')
  @ApiOkResponse({ schema: openApiSchema(routineListSchema) })
  @ApiNotFoundResponse({ description: 'El cliente no existe o no tienes acceso.' })
  list(
    @CurrentUser() actor: AuthUser,
    @Param('clientId', uuid) clientId: string,
  ): Promise<RoutineList> {
    return this.routines.listForClient(actor, clientId);
  }

  @Post('clients/:clientId/routines')
  @ApiBody({ schema: openApiSchema(createRoutineRequestSchema, 'input') })
  @ApiCreatedResponse({ schema: openApiSchema(routineSchema) })
  @ApiUnprocessableEntityResponse({ description: 'No es un cliente o alguna plantilla no existe.' })
  create(
    @CurrentUser() actor: AuthUser,
    @Param('clientId', uuid) clientId: string,
    @Body(new ZodValidationPipe(createRoutineRequestSchema))
    body: z.output<typeof createRoutineRequestSchema>,
  ): Promise<Routine> {
    return this.routines.create(actor, clientId, body);
  }

  @Get('routines/:id')
  @ApiOkResponse({ schema: openApiSchema(routineSchema) })
  get(@CurrentUser() actor: AuthUser, @Param('id', uuid) id: string): Promise<Routine> {
    return this.routines.get(actor, id);
  }

  @Put('routines/:id')
  @ApiBody({ schema: openApiSchema(saveRoutineRequestSchema, 'input') })
  @ApiOkResponse({ schema: openApiSchema(routineSchema) })
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id', uuid) id: string,
    @Body(new ZodValidationPipe(saveRoutineRequestSchema))
    body: z.output<typeof saveRoutineRequestSchema>,
  ): Promise<Routine> {
    return this.routines.update(actor, id, body);
  }

  @Post('routines/:id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: openApiSchema(routineSchema) })
  activate(@CurrentUser() actor: AuthUser, @Param('id', uuid) id: string): Promise<Routine> {
    return this.routines.activate(actor, id);
  }

  @Post('routines/:id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: openApiSchema(routineSchema) })
  deactivate(@CurrentUser() actor: AuthUser, @Param('id', uuid) id: string): Promise<Routine> {
    return this.routines.deactivate(actor, id);
  }
}
