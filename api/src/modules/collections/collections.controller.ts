import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../../common/guards/jwt.guards';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  confirmDeliverySchema,
  createCollectionSchema,
  type ConfirmDeliveryDto,
  type CreateCollectionDto,
} from './collections.dto';
import { CollectionsService } from './collections.service';

@Controller('collections')
@UseGuards(JwtGuard)
export class CollectionsController {
  constructor(private readonly service: CollectionsService) {}

  @Get()
  @Roles('ADMIN', 'DRIVER')
  findAll() {
    return this.service.findAll();
  }

  @Get('impact')
  @Roles('ADMIN')
  getImpactSummary() {
    return this.service.getImpactSummary();
  }

  @Post()
  @Roles('ADMIN', 'DRIVER')
  create(
    @Body(new ZodValidationPipe(createCollectionSchema))
    dto: CreateCollectionDto,
  ) {
    return this.service.create(dto);
  }

  @Patch(':id/delivery')
  @Roles('ADMIN', 'DRIVER')
  confirmDelivery(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(confirmDeliverySchema))
    dto: ConfirmDeliveryDto,
  ) {
    return this.service.confirmDelivery(id, dto);
  }
}
