import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../infrastructure/database/database.module';
import { type DrizzleClient } from '../../infrastructure/database/db';
import { SensorsRepository } from './sensors.repository';
import { BinsService } from '../bins/bins.service';
import { CreateSensorDataDto } from './sensors.dto';
import { SensorData } from './sensors.schema';
import { smartBins } from '../bins/bins.schema';
import { Inject } from '@nestjs/common';

@Injectable()
export class SensorsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleClient,
    private readonly sensorsRepository: SensorsRepository,
    private readonly binsService: BinsService,
  ) {}

  async recordReadings(dto: CreateSensorDataDto): Promise<SensorData> {
    try {
      await this.binsService.findById(dto.binId);

      const reading = await this.sensorsRepository.create({
        binId: dto.binId,
        measureDistanceCm: dto.measureDistanceCm,
        fillPercentage: dto.fillPercentage,
        batteryVoltage: dto.batteryVoltage,
      });

      if (!reading) {
        throw new InternalServerErrorException(
          'Failed to record sensor reading',
        );
      }

      const fillLevel = Math.round(dto.fillPercentage);
      const updatedBin = await this.db
        .update(smartBins)
        .set({
          currentFillLevel: fillLevel,
          needsCollection: fillLevel >= 75,
          lastUpdated: new Date(),
        })
        .where(eq(smartBins.id, dto.binId))
        .returning({ id: smartBins.id });

      if (!updatedBin[0]) {
        throw new InternalServerErrorException(
          `Failed to update fill level for bin with id ${dto.binId}`,
        );
      }

      return reading;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to process sensor reading',
      );
    }
  }

  async getHistoryByBinId(binId: string): Promise<SensorData[]> {
    await this.binsService.findById(binId);
    return this.sensorsRepository.findByBinId(binId);
  }

  async getRecentByBinId(binId: string, limit: number): Promise<SensorData[]> {
    await this.binsService.findById(binId);
    return this.sensorsRepository.findRecentByBinId(binId, limit);
  }
}
