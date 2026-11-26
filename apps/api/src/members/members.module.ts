import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env';
import { MemberImportsController } from './member-imports.controller';
import { MemberImportsService } from './member-imports.service';
import { MEMBERS_PROVIDER, type MembersProvider } from './members-provider';
import { MockMembersProvider } from './mock-members.provider';
import { TimpMembersProvider } from './timp-members.provider';

/** Importación de socios (spec 002). El adaptador se elige con MEMBERS_PROVIDER. */
@Module({
  controllers: [MemberImportsController],
  providers: [
    MemberImportsService,
    {
      provide: MEMBERS_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): MembersProvider => {
        if (config.get('MEMBERS_PROVIDER', { infer: true }) === 'timp') {
          return new TimpMembersProvider({
            baseUrl: config.get('TIMP_API_URL', { infer: true }) ?? '',
            apiKey: config.get('TIMP_API_KEY', { infer: true }) ?? '',
          });
        }
        return new MockMembersProvider(config.get('MOCK_MEMBERS_COUNT', { infer: true }));
      },
    },
  ],
})
export class MembersModule {}
