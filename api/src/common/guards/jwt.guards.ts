import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { type JwtPayload, jwtPayloadSchema } from '../../modules/auth/auth.dto';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { VehicleRole } from '../../modules/vehicles/vehicles.schema';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    let payload: JwtPayload;

    try {
      const decoded: unknown = await this.jwtService.verifyAsync(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });
      payload = jwtPayloadSchema.parse(decoded);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Attach payload to request so controllers can access it via @Req()
    (request as Request & { user: JwtPayload }).user = payload;

    // Role check — if no roles required, any authenticated user can access
    const requiredRoles = this.reflector.getAllAndOverride<VehicleRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    if (!requiredRoles.includes(payload.role)) {
      throw new ForbiddenException(
        `Access denied. Required role: ${requiredRoles.join(' or ')}`,
      );
    }

    return true;
  }

  private extractToken(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return undefined;
    return authHeader.slice(7); // "Bearer " is 7 chars
  }
}
