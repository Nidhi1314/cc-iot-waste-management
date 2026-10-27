import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { BinsRepository } from './bins.repository';
import { SmartBin } from './bins.schema';

import { CreateBinDto, UpdateBinDto, UpdateFillLevelDto } from './bins.dto';

@Injectable()
export class BinsService {
  constructor(private readonly binsRepository: BinsRepository) {}

  async findAll(limit: number, offset: number): Promise<SmartBin[]> {
    return this.binsRepository.findAll(limit, offset);
  }

  async findById(id: string): Promise<SmartBin> {
    const bin = await this.binsRepository.findById(id);

    if (!bin) {
      throw new NotFoundException(`Generator with id ${id} not found`);
    }

    return bin;
  }

  async findNeedingCollection(): Promise<SmartBin[]> {
    return this.binsRepository.findNeedingCollection();
  }

  async create(dto: CreateBinDto): Promise<SmartBin> {
    this.validatePickupWindow(dto.pickupWindowStart, dto.pickupWindowEnd);

    const created = await this.binsRepository.create({
      address: dto.address,
      latitude: dto.latitude,
      longitude: dto.longitude,
      totalDepthCm: dto.totalDepthCm,
      maxCapacityKg: dto.maxCapacityKg,
      status: dto.status,

      generatorName: dto.generatorName,
      generatorType: dto.generatorType,
      wasteCategory: dto.wasteCategory,
      estDailyKg: dto.estDailyKg,
      pickupWindowStart: dto.pickupWindowStart,
      pickupWindowEnd: dto.pickupWindowEnd,
      contactName: dto.contactName,
      contactPhone: dto.contactPhone,
    });

    if (!created) {
      throw new InternalServerErrorException('Failed to create generator');
    }

    return created;
  }

  async update(id: string, dto: UpdateBinDto): Promise<SmartBin> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'At least one field is required for update',
      );
    }

    const existing = await this.findById(id);

    this.validatePickupWindow(
      dto.pickupWindowStart ?? existing.pickupWindowStart ?? undefined,
      dto.pickupWindowEnd ?? existing.pickupWindowEnd ?? undefined,
    );

    const updated = await this.binsRepository.update(id, {
      address: dto.address,
      latitude: dto.latitude,
      longitude: dto.longitude,
      totalDepthCm: dto.totalDepthCm,
      maxCapacityKg: dto.maxCapacityKg,
      status: dto.status,

      generatorName: dto.generatorName,
      generatorType: dto.generatorType,
      wasteCategory: dto.wasteCategory,
      estDailyKg: dto.estDailyKg,
      pickupWindowStart: dto.pickupWindowStart,
      pickupWindowEnd: dto.pickupWindowEnd,
      contactName: dto.contactName,
      contactPhone: dto.contactPhone,
    });

    if (!updated) {
      throw new InternalServerErrorException('Failed to update generator');
    }

    return updated;
  }

  async updateFillLevel(
    id: string,
    dto: UpdateFillLevelDto,
  ): Promise<SmartBin | undefined> {
    await this.findById(id);

    const updated = await this.binsRepository.updateFillLevel(
      id,
      dto.fillLevel,
    );

    if (!updated) {
      throw new InternalServerErrorException('Failed to update fill level');
    }

    return updated;
  }

  async delete(id: string): Promise<SmartBin> {
    await this.findById(id);

    const deleted = await this.binsRepository.delete(id);

    if (!deleted) {
      throw new InternalServerErrorException('Failed to delete generator');
    }

    return deleted;
  }

  private validatePickupWindow(start?: string, end?: string): void {
    if ((start && !end) || (!start && end)) {
      throw new BadRequestException(
        'Both pickup start and end times are required',
      );
    }

    if (start && end && start >= end) {
      throw new BadRequestException('Pickup end time must be after start time');
    }
  }
}
