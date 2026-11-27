import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import {
  createScreenRequestSchema,
  pairingCodeSchema,
  pairScreenRequestSchema,
  pairScreenResponseSchema,
  Role,
  screenListSchema,
  screenSchema,
  type PairingCode,
  type PairScreenResponse,
  type Screen,
  type ScreenList,
} from '@bloom/shared';
import type { Request } from 'express';
import type { z } from 'zod';
import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { openApiSchema } from '../common/openapi';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ScreensService } from './screens.service';

const uuid = new ParseUUIDPipe({ version: '4' });

/** Pantallas de sala (spec 005, HU-005-1). */
@ApiTags('pantallas')
@Controller('screens')
export class ScreensController {
  constructor(private readonly screens: ScreensService) {}

  @Get()
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOkResponse({ schema: openApiSchema(screenListSchema) })
  list(@CurrentUser() actor: AuthUser): Promise<ScreenList> {
    return this.screens.list(actor);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiBody({ schema: openApiSchema(createScreenRequestSchema, 'input') })
  @ApiCreatedResponse({ schema: openApiSchema(pairingCodeSchema) })
  create(
    @CurrentUser() actor: AuthUser,
    @Body(new ZodValidationPipe(createScreenRequestSchema))
    body: z.output<typeof createScreenRequestSchema>,
  ): Promise<PairingCode> {
    return this.screens.create(actor, body.name);
  }

  @Post(':id/pairing-code')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiCreatedResponse({ schema: openApiSchema(pairingCodeSchema) })
  newCode(@CurrentUser() actor: AuthUser, @Param('id', uuid) id: string): Promise<PairingCode> {
    return this.screens.newCode(actor, id);
  }

  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOkResponse({ schema: openApiSchema(screenSchema) })
  revoke(@CurrentUser() actor: AuthUser, @Param('id', uuid) id: string): Promise<Screen> {
    return this.screens.revoke(actor, id);
  }

  /** Lo llama el televisor sin sesión de usuario (constitución §3.1). */
  @Public()
  @Post('pair')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ schema: openApiSchema(pairScreenRequestSchema, 'input') })
  @ApiOkResponse({ schema: openApiSchema(pairScreenResponseSchema) })
  @ApiBadRequestResponse({ description: 'Código no válido, caducado o ya usado.' })
  @ApiTooManyRequestsResponse({ description: 'Demasiados intentos fallidos desde esta IP.' })
  pair(
    @Req() req: Request,
    @Body(new ZodValidationPipe(pairScreenRequestSchema))
    body: z.output<typeof pairScreenRequestSchema>,
  ): Promise<PairScreenResponse> {
    return this.screens.pair(body.code, req.ip ?? 'desconocida');
  }
}
