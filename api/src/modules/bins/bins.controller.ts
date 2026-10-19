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
  UsePipes,
} from '@nestjs/common';
import { BinsService } from './bins.service';
import {
  createBinSchema,
  type CreateBinDto,
  updateBinSchema,
  type UpdateBinDto,
  updateFillLevelSchema,
  type UpdateFillLevelDto,
} from './bins.dto';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtGuard } from '../../common/guards/jwt.guards';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtGuard)
@Controller('bins')
export class BinsController {
  constructor(private readonly binsService: BinsService) {}

  @Get()
  @Roles('ADMIN', 'DRIVER')
  async findAll(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.binsService.findAll(
      this.clamp(limit, 1, 200),
      this.clamp(offset, 0, 10000),
    );
  }

  @Get('critical')
  @Roles('ADMIN', 'DRIVER')
  async findNeedingCollection() {
    return this.binsService.findNeedingCollection();
  }

  @Get(':id')
  @Roles('ADMIN', 'DRIVER')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.binsService.findById(id);
  }

  @Post()
  @Roles('ADMIN')
  @UsePipes(new ZodValidationPipe(createBinSchema))
  async create(@Body() dto: CreateBinDto) {
    return this.binsService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateBinSchema)) dto: UpdateBinDto,
  ) {
    return this.binsService.update(id, dto);
  }

  @Patch(':id/fill-level')
  @Roles('ADMIN', 'DRIVER')
  async updateFillLevel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateFillLevelSchema)) dto: UpdateFillLevelDto,
  ) {
    return this.binsService.updateFillLevel(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.binsService.delete(id);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
