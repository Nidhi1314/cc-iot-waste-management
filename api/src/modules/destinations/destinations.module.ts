import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { DestinationsController } from './destinations.controller';

import { DestinationsService } from './destinations.service';

import { JwtGuard } from '../../common/guards/jwt.guards';

@Module({
  imports: [JwtModule.register({})],
  controllers: [DestinationsController],
  providers: [DestinationsService, JwtGuard],
  exports: [DestinationsService],
})
export class DestinationsModule {}
