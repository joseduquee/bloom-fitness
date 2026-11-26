import { Controller, Get, Post } from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  memberImportListSchema,
  memberImportSchema,
  Role,
  type MemberImport,
  type MemberImportList,
} from '@bloom/shared';
import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { openApiSchema } from '../common/openapi';
import { MemberImportsService } from './member-imports.service';

@ApiTags('importación de socios')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('member-imports')
export class MemberImportsController {
  constructor(private readonly imports: MemberImportsService) {}

  @Get()
  @ApiOkResponse({ schema: openApiSchema(memberImportListSchema) })
  list(@CurrentUser() actor: AuthUser): Promise<MemberImportList> {
    return this.imports.list(actor);
  }

  @Post()
  @ApiCreatedResponse({ schema: openApiSchema(memberImportSchema) })
  @ApiBadGatewayResponse({ description: 'El proveedor no responde. No se modifica ningún dato.' })
  @ApiConflictResponse({ description: 'Ya hay una importación en curso.' })
  run(@CurrentUser() actor: AuthUser): Promise<MemberImport> {
    return this.imports.run(actor);
  }
}
