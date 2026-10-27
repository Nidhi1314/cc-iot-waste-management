import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtGuard } from '../../common/guards/jwt.guards';
import { CollectionsController } from './collections.controller';
import { CollectionsService } from './collections.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [CollectionsController],
  providers: [CollectionsService, JwtGuard],
})
export class CollectionsModule {}
