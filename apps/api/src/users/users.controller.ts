import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  activationLinkResponseSchema,
  createUserRequestSchema,
  createUserResponseSchema,
  listUsersQuerySchema,
  Role,
  updateUserRequestSchema,
  userListSchema,
  userSchema,
  type ActivationLinkResponse,
  type CreateUserResponse,
  type User,
  type UserList,
} from '@bloom/shared';
import type { z } from 'zod';
import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { openApiSchema } from '../common/openapi';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { UsersService } from './users.service';

const uuid = new ParseUUIDPipe({ version: '4' });

@ApiTags('usuarios')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TRAINER)
  @ApiOkResponse({ schema: openApiSchema(userListSchema) })
  list(
    @CurrentUser() actor: AuthUser,
    @Query(new ZodValidationPipe(listUsersQuerySchema))
    query: z.output<typeof listUsersQuerySchema>,
  ): Promise<UserList> {
    return this.users.list(actor, query);
  }

  @Get(':id')
  @ApiOkResponse({ schema: openApiSchema(userSchema) })
  @ApiNotFoundResponse({ description: 'No existe o no tienes acceso.' })
  get(@CurrentUser() actor: AuthUser, @Param('id', uuid) id: string): Promise<User> {
    return this.users.get(actor, id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiBody({ schema: openApiSchema(createUserRequestSchema, 'input') })
  @ApiCreatedResponse({ schema: openApiSchema(createUserResponseSchema) })
  @ApiConflictResponse({ description: 'El correo ya está registrado.' })
  create(
    @CurrentUser() actor: AuthUser,
    @Body(new ZodValidationPipe(createUserRequestSchema))
    body: z.output<typeof createUserRequestSchema>,
  ): Promise<CreateUserResponse> {
    return this.users.create(actor, body);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiBody({ schema: openApiSchema(updateUserRequestSchema, 'input') })
  @ApiOkResponse({ schema: openApiSchema(userSchema) })
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id', uuid) id: string,
    @Body(new ZodValidationPipe(updateUserRequestSchema))
    body: z.output<typeof updateUserRequestSchema>,
  ): Promise<User> {
    return this.users.update(actor, id, body);
  }

  @Post(':id/deactivate')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: openApiSchema(userSchema) })
  deactivate(@CurrentUser() actor: AuthUser, @Param('id', uuid) id: string): Promise<User> {
    return this.users.deactivate(actor, id);
  }

  @Post(':id/reactivate')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: openApiSchema(userSchema) })
  reactivate(@CurrentUser() actor: AuthUser, @Param('id', uuid) id: string): Promise<User> {
    return this.users.reactivate(actor, id);
  }

  @Post(':id/activation-link')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: openApiSchema(activationLinkResponseSchema) })
  activationLink(
    @CurrentUser() actor: AuthUser,
    @Param('id', uuid) id: string,
  ): Promise<ActivationLinkResponse> {
    return this.users.newActivationLink(actor, id);
  }
}
