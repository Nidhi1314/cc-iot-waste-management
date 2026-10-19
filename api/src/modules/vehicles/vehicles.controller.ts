import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  DefaultValuePipe,
  ParseUUIDPipe,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createVehicleSchema,
  type CreateVehicleDto,
  updateVehicleSchema,
  type UpdateVehicleDto,
} from './vehicles.dto';
import { JwtGuard } from '../../common/guards/jwt.guards';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  @Roles('ADMIN')
  findAll(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.vehiclesService.findAll({
      limit: this.clamp(limit, 1, 200),
      offset: this.clamp(offset, 0, 10000),
    });
  }

  @Get(':id')
  @Roles('ADMIN')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.findById(id);
  }

  @Post()
  @Roles('ADMIN')
  create(
    @Body(new ZodValidationPipe(createVehicleSchema)) dto: CreateVehicleDto,
  ) {
    return this.vehiclesService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateVehicleSchema)) dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.delete(id);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
