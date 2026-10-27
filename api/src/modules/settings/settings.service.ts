import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { DRIZZLE } from '../../infrastructure/database/database.module';

import { type DrizzleClient } from '../../infrastructure/database/db';

import { systemSettings } from './settings.schema';

import { smartBins } from '../bins/bins.schema';

export type UpdateSettingsDto = {
  fillThreshold?: number;
  maxWasteAgeHours?: number;
};

@Injectable()
export class SettingsService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleClient,
  ) {}

  async getSettings() {
    // Ensure the single global settings row exists.
    await this.db
      .insert(systemSettings)
      .values({ id: 1 })
      .onConflictDoNothing();

    const rows = await this.db.select().from(systemSettings).limit(1);

    return rows[0];
  }

  async getFillThreshold(): Promise<number> {
    const settings = await this.getSettings();
    return settings.fillThreshold;
  }

  async updateSettings(dto: UpdateSettingsDto) {
    if (dto.fillThreshold === undefined && dto.maxWasteAgeHours === undefined) {
      throw new BadRequestException('At least one setting must be provided');
    }

    if (dto.fillThreshold !== undefined) {
      if (
        !Number.isInteger(dto.fillThreshold) ||
        dto.fillThreshold < 10 ||
        dto.fillThreshold > 100
      ) {
        throw new BadRequestException(
          'Fill threshold must be an integer between 10 and 100',
        );
      }
    }

    if (dto.maxWasteAgeHours !== undefined) {
      if (
        !Number.isInteger(dto.maxWasteAgeHours) ||
        dto.maxWasteAgeHours < 1 ||
        dto.maxWasteAgeHours > 72
      ) {
        throw new BadRequestException(
          'Maximum waste age must be an integer between 1 and 72 hours',
        );
      }
    }

    const current = await this.getSettings();

    const newThreshold = dto.fillThreshold ?? current.fillThreshold;

    const newMaxAge = dto.maxWasteAgeHours ?? current.maxWasteAgeHours;

    const updated = await this.db
      .update(systemSettings)
      .set({
        fillThreshold: newThreshold,
        maxWasteAgeHours: newMaxAge,
        updatedAt: new Date(),
      })
      .where(sql`${systemSettings.id} = 1`)
      .returning();

    // Recalculate existing collection flags when
    // the fill threshold changes.
    if (
      (dto.fillThreshold !== undefined &&
        newThreshold !== current.fillThreshold) ||
      (dto.maxWasteAgeHours !== undefined &&
        newMaxAge !== current.maxWasteAgeHours)
    ) {
      const ageCutoff = new Date(Date.now() - newMaxAge * 60 * 60 * 1000);
      await this.db.update(smartBins).set({
        needsCollection: sql`(
          ${smartBins.currentFillLevel} >= ${newThreshold}
          OR (
            ${smartBins.currentFillLevel} > 0
            AND COALESCE(${smartBins.fillStartedAt}, ${smartBins.lastUpdated}) <= ${ageCutoff}
          )
        )`,
      });
    }

    return updated[0];
  }
}
