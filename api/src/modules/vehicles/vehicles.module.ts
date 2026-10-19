import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';
import { VehiclesRepository } from './vehicles.repository';
import { JwtGuard } from '../../common/guards/jwt.guards';

@Module({
  imports: [JwtModule.register({})],
  controllers: [VehiclesController],
  providers: [VehiclesService, VehiclesRepository, JwtGuard],
  exports: [VehiclesService],
})
export class VehiclesModule {}
