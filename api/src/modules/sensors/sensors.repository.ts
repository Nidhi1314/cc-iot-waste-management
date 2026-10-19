import { Inject, Injectable } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { DRIZZLE } from '../../infrastructure/database/database.module';
import { type DrizzleClient } from '../../infrastructure/database/db';
import { sensorData, NewSensorData, SensorData } from './sensors.schema';

@Injectable()
export class SensorsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleClient) {}

  async create(data: NewSensorData): Promise<SensorData> {
    const result = await this.db.insert(sensorData).values(data).returning();

    return result[0];
  }

  async findByBinId(binId: string): Promise<SensorData[]> {
    return this.db
      .select()
      .from(sensorData)
      .where(eq(sensorData.binId, binId))
      .orderBy(desc(sensorData.recordedAt));
  }

  async findRecentByBinId(binId: string, limit: number): Promise<SensorData[]> {
    return this.db
      .select()
      .from(sensorData)
      .where(eq(sensorData.binId, binId))
      .orderBy(desc(sensorData.recordedAt))
      .limit(limit);
  }
}
