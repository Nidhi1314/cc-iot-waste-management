import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDrizzleClient, DrizzleClient } from './db';

export const DRIZZLE = Symbol('DRIZZLE');

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): DrizzleClient => {
        const databaseUrl = configService.getOrThrow<string>('DATABASE_URL');
        return createDrizzleClient(databaseUrl);
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
