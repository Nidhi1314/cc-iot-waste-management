import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';
import { RoutesRepository } from './routes.repository';
import { BinsModule } from '../bins/bins.module';
import { JwtGuard } from '../../common/guards/jwt.guards';
import { DestinationsModule } from '../destinations/destinations.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    BinsModule,
    DestinationsModule,
    SettingsModule,
    JwtModule.register({}),
  ],
  controllers: [RoutesController],
  providers: [RoutesService, RoutesRepository, JwtGuard],
})
export class RoutesModule {}
