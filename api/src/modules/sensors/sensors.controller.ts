import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  DefaultValuePipe,
  ParseUUIDPipe,
  Query,
  ParseIntPipe,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { SensorsService } from './sensors.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createSensorDataSchema,
  type CreateSensorDataDto,
} from './sensors.dto';
import { JwtGuard } from '../../common/guards/jwt.guards';
import { SensorAuthGuard } from '../../common/guards/sensor-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('sensors')
export class SensorsController {
  constructor(private readonly sensorsService: SensorsService) {}

  @UseGuards(SensorAuthGuard)
  @Post('data')
  recordReadings(
    @Body(new ZodValidationPipe(createSensorDataSchema))
    dto: CreateSensorDataDto,
  ) {
    return this.sensorsService.recordReadings(dto);
  }

  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'DRIVER')
  @Get('history/:binId')
  getSensorHistory(
    @Param('binId', ParseUUIDPipe) binId: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    if (limit < 1) {
      throw new BadRequestException('limit must be at least 1');
    }

    return this.sensorsService.getRecentByBinId(binId, Math.min(limit, 200));
  }
}
