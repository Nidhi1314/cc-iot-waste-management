import {
  Body,
  Controller,
  Delete,
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

import { DestinationsService } from './destinations.service';

import {
  createDestinationSchema,
  updateDestinationSchema,
  type CreateDestinationDto,
  type UpdateDestinationDto,
} from './destinations.dto';

@Controller('destinations')
@UseGuards(JwtGuard)
export class DestinationsController {
  constructor(private readonly service: DestinationsService) {}

  @Get()
  @Roles('ADMIN', 'DRIVER')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'DRIVER')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles('ADMIN')
  create(
    @Body(new ZodValidationPipe(createDestinationSchema))
    dto: CreateDestinationDto,
  ) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @Param('id', ParseUUIDPipe) id: string,

    @Body(new ZodValidationPipe(updateDestinationSchema))
    dto: UpdateDestinationDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.delete(id);
  }
}
