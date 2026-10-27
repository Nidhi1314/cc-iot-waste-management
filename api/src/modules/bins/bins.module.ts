import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { BinsController } from './bins.controller';
import { BinsService } from './bins.service';
import { BinsRepository } from './bins.repository';
import { CollectionAgingService } from './collection-aging.service';

import { JwtGuard } from '../../common/guards/jwt.guards';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [JwtModule.register({}), SettingsModule],
  controllers: [BinsController],
  providers: [BinsService, BinsRepository, CollectionAgingService, JwtGuard],
  exports: [BinsService],
})
export class BinsModule {}
