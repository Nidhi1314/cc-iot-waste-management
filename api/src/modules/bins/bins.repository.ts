import { Inject, Injectable } from '@nestjs/common';
import { desc, eq, or, sql } from 'drizzle-orm';

import { DRIZZLE } from '../../infrastructure/database/database.module';
import { type DrizzleClient } from '../../infrastructure/database/db';

import {
  smartBins,
  NewSmartBin,
  UpdateSmartBin,
  SmartBin,
} from './bins.schema';

import { SettingsService } from '../settings/settings.service';

@Injectable()
export class BinsRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleClient,

    private readonly settingsService: SettingsService,
  ) {}

  async findAll(limit: number, offset: number): Promise<SmartBin[]> {
    return this.db
      .select()
      .from(smartBins)
      .orderBy(desc(smartBins.lastUpdated))
      .limit(limit)
      .offset(offset);
  }

  async findById(id: string): Promise<SmartBin | undefined> {
    const result = await this.db
      .select()
      .from(smartBins)
      .where(eq(smartBins.id, id))
      .limit(1);

    return result[0];
  }

  async findNeedingCollection(): Promise<SmartBin[]> {
    const settings = await this.settingsService.getSettings();
    const ageCutoff = new Date(
      Date.now() - settings.maxWasteAgeHours * 60 * 60 * 1000,
    );

    return this.db
      .select()
      .from(smartBins)
      .where(
        or(
          eq(smartBins.needsCollection, true),
          sql`(${smartBins.currentFillLevel} > 0 AND COALESCE(${smartBins.fillStartedAt}, ${smartBins.lastUpdated}) <= ${ageCutoff})`,
        ),
      );
  }

  async create(data: NewSmartBin): Promise<SmartBin> {
    const result = await this.db.insert(smartBins).values(data).returning();

    return result[0];
  }

  async update(
    id: string,
    data: UpdateSmartBin,
  ): Promise<SmartBin | undefined> {
    const result = await this.db
      .update(smartBins)
      .set(data)
      .where(eq(smartBins.id, id))
      .returning();

    return result[0];
  }

  async updateFillLevel(
    id: string,
    fillLevel: number,
  ): Promise<SmartBin | undefined> {
    const settings = await this.settingsService.getSettings();
    const ageCutoff = new Date(
      Date.now() - settings.maxWasteAgeHours * 60 * 60 * 1000,
    );

    const result = await this.db
      .update(smartBins)
      .set({
        currentFillLevel: fillLevel,
        needsCollection: sql`(
          ${fillLevel} >= ${settings.fillThreshold}
          OR (
            ${fillLevel} > 0
            AND COALESCE(${smartBins.fillStartedAt}, ${smartBins.lastUpdated}) <= ${ageCutoff}
          )
        )`,
        fillStartedAt:
          fillLevel === 0
            ? null
            : sql`COALESCE(
                ${smartBins.fillStartedAt},
                CASE
                  WHEN ${smartBins.currentFillLevel} = 0 THEN now()
                  ELSE ${smartBins.lastUpdated}
                END
              )`,
        lastUpdated: new Date(),
      })
      .where(eq(smartBins.id, id))
      .returning();

    return result[0];
  }

  async delete(id: string): Promise<SmartBin | undefined> {
    const result = await this.db
      .delete(smartBins)
      .where(eq(smartBins.id, id))
      .returning();

    return result[0];
  }
}
