import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';

type SensorAuthMode = 'off' | 'monitor' | 'enforce';

@Injectable()
export class SensorAuthGuard implements CanActivate {
  private readonly logger = new Logger(SensorAuthGuard.name);
  private readonly maxClockSkewSec: number;
  private cachedSecretsRaw: string | null = null;
  private cachedSecrets: Record<string, string> = {};

  constructor(private readonly configService: ConfigService) {
    this.maxClockSkewSec = Number(
      this.configService.get<string>('SENSOR_AUTH_MAX_CLOCK_SKEW_SEC') ?? '300',
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const mode = this.getMode();

    if (mode === 'off') {
      return true;
    }

    const keyId = this.getHeader(request, 'x-sensor-key-id');
    const timestamp = this.getHeader(request, 'x-sensor-timestamp');
    const signature = this.getHeader(request, 'x-sensor-signature');
    const secrets = this.getSecrets();

    const secret = keyId ? secrets[keyId] : undefined;
    const now = Math.floor(Date.now() / 1000);
    const timestampSec = Number(timestamp);
    const isTimestampValid =
      Number.isFinite(timestampSec) &&
      Math.abs(now - timestampSec) <= this.maxClockSkewSec;

    const providedMaterial = [keyId, timestamp, signature].every(
      (value) => typeof value === 'string' && value.length > 0,
    );

    const expectedSignature =
      providedMaterial && secret && timestamp
        ? this.signRequest(request, secret, timestamp)
        : null;

    const isValid =
      Boolean(providedMaterial) &&
      Boolean(secret) &&
      isTimestampValid &&
      Boolean(signature) &&
      Boolean(expectedSignature) &&
      this.safeEquals(signature as string, expectedSignature as string);

    if (isValid) {
      return true;
    }

    const reason = !providedMaterial
      ? 'missing auth headers'
      : !secret
        ? 'unknown key id'
        : !isTimestampValid
          ? 'invalid timestamp'
          : 'signature mismatch';

    if (mode === 'monitor') {
      this.logger.warn(`Sensor auth monitor mode: ${reason}`);
      return true;
    }

    throw new UnauthorizedException('Invalid sensor authentication signature');
  }

  private getMode(): SensorAuthMode {
    const raw =
      this.configService.get<string>('SENSOR_AUTH_MODE')?.toLowerCase() ??
      'monitor';
    if (raw === 'off' || raw === 'monitor' || raw === 'enforce') {
      return raw;
    }
    return 'monitor';
  }

  private getSecrets(): Record<string, string> {
    const raw = this.configService.get<string>('SENSOR_AUTH_KEYS') ?? '{}';

    if (raw === this.cachedSecretsRaw) {
      return this.cachedSecrets;
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        this.cachedSecretsRaw = raw;
        this.cachedSecrets = {};
        return this.cachedSecrets;
      }

      this.cachedSecretsRaw = raw;
      this.cachedSecrets = Object.fromEntries(
        Object.entries(parsed).filter(
          (entry): entry is [string, string] => typeof entry[1] === 'string',
        ),
      );
      return this.cachedSecrets;
    } catch {
      this.logger.warn('SENSOR_AUTH_KEYS is not valid JSON');
      this.cachedSecretsRaw = raw;
      this.cachedSecrets = {};
      return this.cachedSecrets;
    }
  }

  private signRequest(
    request: Request,
    secret: string,
    timestamp: string,
  ): string {
    const method = request.method.toUpperCase();
    const path = request.path;
    const bodyHash = this.getBodyHash(request);
    const payload = `${method}\n${path}\n${timestamp}\n${bodyHash}`;

    return createHmac('sha256', secret).update(payload).digest('hex');
  }

  private getBodyHash(request: Request): string {
    const withRawBody = request as Request & { rawBody?: Buffer | string };
    const rawBody = withRawBody.rawBody;

    if (Buffer.isBuffer(rawBody)) {
      return createHash('sha256').update(rawBody).digest('hex');
    }

    if (typeof rawBody === 'string') {
      return createHash('sha256').update(rawBody).digest('hex');
    }

    const stableJson = JSON.stringify(this.sortJson(request.body));
    return createHash('sha256').update(stableJson).digest('hex');
  }

  private sortJson(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sortJson(item));
    }

    if (value && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>).sort(
        ([left], [right]) => left.localeCompare(right),
      );

      return Object.fromEntries(
        entries.map(([key, nestedValue]) => [key, this.sortJson(nestedValue)]),
      );
    }

    return value;
  }

  private safeEquals(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left, 'utf8');
    const rightBuffer = Buffer.from(right, 'utf8');

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
  }

  private getHeader(request: Request, name: string): string | undefined {
    const value = request.headers[name];

    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }
}
