import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infrastructure/database/database.module';
import { BinsModule } from './modules/bins/bins.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { AuthModule } from './modules/auth/auth.module';
import { SensorsModule } from './modules/sensors/sensors.module';
import { RoutesModule } from './modules/routes/routes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env', '.env'],
    }),
    DatabaseModule,
    BinsModule,
    VehiclesModule,
    AuthModule,
    SensorsModule,
    RoutesModule,
  ],
})
export class AppModule {}
