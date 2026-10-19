import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { VehiclesRepository } from './vehicles.repository';
import { Vehicle, VehiclePublic } from './vehicles.schema';
import { CreateVehicleDto, UpdateVehicleDto } from './vehicles.dto';

const SaltRounds = 10;
const UNIQUE_VIOLATION_ERROR_CODE = '23505';

type PaginationOptions = {
  limit: number;
  offset: number;
};

@Injectable()
export class VehiclesService {
  constructor(private readonly vehiclesRepository: VehiclesRepository) {}

  private toPublic(vehicle: Vehicle): VehiclePublic {
    const { password, ...rest } = vehicle;
    void password;
    return rest;
  }

  async findAll(options: PaginationOptions): Promise<VehiclePublic[]> {
    const all = await this.vehiclesRepository.findAll(
      options.limit,
      options.offset,
    );
    return all.map((v) => this.toPublic(v));
  }

  async findById(id: string): Promise<VehiclePublic> {
    const vehicle = await this.vehiclesRepository.findById(id);
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with id ${id} not found`);
    }

    return this.toPublic(vehicle);
  }

  async findByUserCodeWithPassword(
    userCode: string,
  ): Promise<Vehicle | undefined> {
    return this.vehiclesRepository.findByUserCode(userCode);
  }

  async create(dto: CreateVehicleDto): Promise<VehiclePublic> {
    const existing = await this.vehiclesRepository.findByUserCode(dto.userCode);
    if (existing) {
      throw new ConflictException(
        `Vehicle with user code ${dto.userCode} already exists`,
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, SaltRounds);

    const vehicle = await this.vehiclesRepository.create({
      userCode: dto.userCode,
      password: hashedPassword,
      role: dto.role,
      maxCapacityKg: dto.maxCapacityKg,
    });

    return this.toPublic(vehicle);
  }

  async update(id: string, dto: UpdateVehicleDto): Promise<VehiclePublic> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'At least one field is required for update',
      );
    }

    await this.findById(id);

    let updated: Vehicle | undefined;
    try {
      updated = await this.vehiclesRepository.update(id, dto);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(
          `Vehicle with user code ${dto.userCode} already exists`,
        );
      }
      throw error;
    }

    if (!updated) {
      throw new NotFoundException(`Vehicle with id ${id} not found`);
    }

    return this.toPublic(updated);
  }

  async delete(id: string): Promise<VehiclePublic> {
    await this.findById(id);

    const deleted = await this.vehiclesRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException(`Vehicle with id ${id} not found`);
    }

    return this.toPublic(deleted);
  }

  private isUniqueViolation(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const errorCode = (error as { code?: unknown }).code;
    return errorCode === UNIQUE_VIOLATION_ERROR_CODE;
  }
}
