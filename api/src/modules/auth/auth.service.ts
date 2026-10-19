import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { VehiclesService } from '../vehicles/vehicles.service';
import { JwtPayload, LoginDto, loginResponse } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly vehiclesService: VehiclesService,
  ) {}

  async login(dto: LoginDto): Promise<loginResponse> {
    const vehicle = await this.vehiclesService.findByUserCodeWithPassword(
      dto.userCode,
    );

    if (!vehicle || !(await bcrypt.compare(dto.password, vehicle.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: vehicle.id,
      userCode: vehicle.userCode,
      role: vehicle.role,
    };

    const accessToken = this.jwtService.sign(payload);
    return {
      accessToken,
      user: {
        id: vehicle.id,
        userCode: vehicle.userCode,
        role: vehicle.role,
      },
    };
  }
}
