import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtGuard } from '../../common/guards/jwt.guards';
import { SimulationController } from './simulation.controller';
import { SimulationService } from './simulation.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [SimulationController],
  providers: [SimulationService, JwtGuard],
})
export class SimulationModule {}
