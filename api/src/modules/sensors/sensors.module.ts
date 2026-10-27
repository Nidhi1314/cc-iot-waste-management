import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { SensorsController } from './sensors.controller';
import { SensorsService } from './sensors.service';
import { SensorsRepository } from './sensors.repository';

import { BinsModule } from '../bins/bins.module';
import { SettingsModule } from '../settings/settings.module';

import { SensorAuthGuard } from '../../common/guards/sensor-auth.guard';
import { JwtGuard } from '../../common/guards/jwt.guards';

@Module({
  imports: [BinsModule, SettingsModule, JwtModule.register({})],
  controllers: [SensorsController],
  providers: [SensorsService, SensorsRepository, SensorAuthGuard, JwtGuard],
})
export class SensorsModule {}
