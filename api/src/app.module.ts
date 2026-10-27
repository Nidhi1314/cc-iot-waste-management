import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from './infrastructure/database/database.module';
import { BinsModule } from './modules/bins/bins.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { AuthModule } from './modules/auth/auth.module';
import { SensorsModule } from './modules/sensors/sensors.module';
import { RoutesModule } from './modules/routes/routes.module';
import { SettingsModule } from './modules/settings/settings.module';

import { DestinationsModule } from './modules/destinations/destinations.module';
import { CollectionsModule } from './modules/collections/collections.module';
import { SimulationModule } from './modules/simulation/simulation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env', '.env'],
    }),
    DatabaseModule,
    SettingsModule,
    BinsModule,
    VehiclesModule,
    AuthModule,
    SensorsModule,
    RoutesModule,
    DestinationsModule,
    CollectionsModule,
    SimulationModule,
  ],
})
export class AppModule {}
