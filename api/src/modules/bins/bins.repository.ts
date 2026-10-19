import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../infrastructure/database/database.module';
import { type DrizzleClient } from '../../infrastructure/database/db';
import {
  smartBins,
  NewSmartBin,
  UpdateSmartBin,
  SmartBin,
} from './bins.schema';

@Injectable()
export class BinsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleClient) {}

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
    return this.db
      .select()
      .from(smartBins)
      .where(eq(smartBins.needsCollection, true));
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
    const result = await this.db
      .update(smartBins)
      .set({
        currentFillLevel: fillLevel,
        needsCollection: fillLevel >= 75,
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
