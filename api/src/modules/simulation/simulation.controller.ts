import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../common/guards/jwt.guards';
import { Roles } from '../../common/decorators/roles.decorator';
import { SimulationService } from './simulation.service';

@Controller('simulation')
@UseGuards(JwtGuard)
@Roles('ADMIN')
export class SimulationController {
  constructor(private readonly service: SimulationService) {}

  @Post('next-day')
  simulateNextDay() {
    return this.service.simulateNextDay();
  }

  @Post('reset')
  resetBins() {
    return this.service.resetBins();
  }
}
