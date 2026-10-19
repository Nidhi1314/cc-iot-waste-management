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
import { RoutesService } from './routes.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  directionsRequestSchema,
  generateRouteSchema,
  type DirectionsRequestDto,
  type GenerateRouteDto,
} from './routes.dto';
import { JwtGuard } from '../../common/guards/jwt.guards';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtGuard)
@Controller('routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Get()
  @Roles('ADMIN', 'DRIVER')
  findAll(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.routesService.findAll(
      this.clamp(limit, 1, 200),
      this.clamp(offset, 0, 10000),
    );
  }

  @Get('active')
  @Roles('ADMIN', 'DRIVER')
  findActive() {
    return this.routesService.findActive();
  }

  @Post('directions')
  @Roles('ADMIN', 'DRIVER')
  getDirections(
    @Body(new ZodValidationPipe(directionsRequestSchema))
    dto: DirectionsRequestDto,
  ) {
    return this.routesService.getDirections(dto);
  }

  @Get(':id')
  @Roles('ADMIN', 'DRIVER')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.routesService.findById(id);
  }

  @Post('generate')
  @Roles('ADMIN')
  async generate(
    @Body(new ZodValidationPipe(generateRouteSchema)) dto: GenerateRouteDto,
  ) {
    return this.routesService.generate(dto);
  }

  @Post('generate-predictive')
  @Roles('ADMIN')
  async generatePredictive(
    @Body(new ZodValidationPipe(generateRouteSchema)) dto: GenerateRouteDto,
  ) {
    return this.routesService.generatePredictive(dto, 24);
  }

  @Patch(':id/complete')
  @Roles('ADMIN', 'DRIVER')
  markCompleted(@Param('id', ParseUUIDPipe) id: string) {
    return this.routesService.markCompleted(id);
  }

  @Delete(':id')
  @Roles('ADMIN')
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.routesService.delete(id);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
