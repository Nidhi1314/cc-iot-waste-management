import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';
import { RoutesRepository } from './routes.repository';
import { BinsModule } from '../bins/bins.module';
import { JwtGuard } from '../../common/guards/jwt.guards';

@Module({
  imports: [BinsModule, JwtModule.register({})],
  controllers: [RoutesController],
  providers: [RoutesService, RoutesRepository, JwtGuard],
})
export class RoutesModule {}
