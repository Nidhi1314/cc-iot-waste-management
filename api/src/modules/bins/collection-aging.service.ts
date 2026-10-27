import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '../../infrastructure/database/database.module';
import { type DrizzleClient } from '../../infrastructure/database/db';
import { SettingsService } from '../settings/settings.service';
import { smartBins } from './bins.schema';

@Injectable()
export class CollectionAgingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CollectionAgingService.name);
  private timer: ReturnType<typeof setInterval> | undefined;
  private running = false;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleClient,
    private readonly settingsService: SettingsService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.refresh().catch((error: unknown) => this.logFailure(error));
    }, 60_000);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async refresh(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const { maxWasteAgeHours, fillThreshold } =
        await this.settingsService.getSettings();
      const ageCutoff = new Date(
        Date.now() - maxWasteAgeHours * 60 * 60 * 1000,
      );
      await this.db.update(smartBins).set({
        fillStartedAt: sql`COALESCE(${smartBins.fillStartedAt}, ${smartBins.lastUpdated})`,
        needsCollection: sql`(
            ${smartBins.currentFillLevel} >= ${fillThreshold}
            OR (
              ${smartBins.currentFillLevel} > 0
              AND COALESCE(${smartBins.fillStartedAt}, ${smartBins.lastUpdated}) <= ${ageCutoff}
            )
          )`,
      }).where(sql`
          ${smartBins.currentFillLevel} > 0
          AND COALESCE(${smartBins.fillStartedAt}, ${smartBins.lastUpdated}) <= ${ageCutoff}
        `);
    } finally {
      this.running = false;
    }
  }

  private logFailure(error: unknown): void {
    this.logger.error(
      'Scheduled waste-age check failed',
      error instanceof Error ? error.stack : String(error),
    );
  }
}
