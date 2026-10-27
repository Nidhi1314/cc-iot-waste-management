import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { JwtGuard } from '../../common/guards/jwt.guards';

@Module({
  imports: [JwtModule.register({})],
  controllers: [SettingsController],
  providers: [SettingsService, JwtGuard],
  exports: [SettingsService],
})
export class SettingsModule {}
