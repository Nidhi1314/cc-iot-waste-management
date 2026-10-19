import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { BinsController } from './bins.controller';
import { BinsService } from './bins.service';
import { BinsRepository } from './bins.repository';
import { JwtGuard } from '../../common/guards/jwt.guards';

@Module({
  imports: [JwtModule.register({})],
  controllers: [BinsController],
  providers: [BinsService, BinsRepository, JwtGuard],
  exports: [BinsService],
})
export class BinsModule {}
