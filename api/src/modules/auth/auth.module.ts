import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LoginThrottleGuard } from '../../common/guards/login-throttle.guard';

@Module({
  imports: [
    VehiclesModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<StringValue>('JWT_EXPIRES_IN') ?? '24h',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LoginThrottleGuard],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
