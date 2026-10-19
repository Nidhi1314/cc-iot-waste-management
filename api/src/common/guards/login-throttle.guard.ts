import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

type AttemptWindow = {
  count: number;
  resetAt: number;
};

@Injectable()
export class LoginThrottleGuard implements CanActivate {
  private readonly windows = new Map<string, AttemptWindow>();
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly cleanupInterval = 250;
  private requestCounter = 0;

  constructor(private readonly configService: ConfigService) {
    this.maxAttempts = Number(
      this.configService.get<string>('LOGIN_RATE_LIMIT_MAX_ATTEMPTS') ?? '8',
    );
    this.windowMs = Number(
      this.configService.get<string>('LOGIN_RATE_LIMIT_WINDOW_MS') ?? '60000',
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const key = this.buildKey(request);
    const now = Date.now();

    this.requestCounter += 1;
    if (this.requestCounter >= this.cleanupInterval) {
      this.cleanupExpiredWindows(now);
      this.requestCounter = 0;
    }

    const current = this.windows.get(key);

    if (!current || now > current.resetAt) {
      this.windows.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    if (current.count >= this.maxAttempts) {
      throw new HttpException(
        'Too many login attempts. Please try again shortly.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    current.count += 1;
    this.windows.set(key, current);
    return true;
  }

  private cleanupExpiredWindows(now: number): void {
    for (const [entryKey, entry] of this.windows.entries()) {
      if (now > entry.resetAt) {
        this.windows.delete(entryKey);
      }
    }
  }

  private buildKey(request: Request): string {
    const ip = request.ip ?? 'unknown-ip';
    const body = request.body as { userCode?: string } | undefined;
    const userCode = body?.userCode?.trim().toLowerCase() ?? 'unknown-user';
    return `${ip}:${userCode}`;
  }
}
