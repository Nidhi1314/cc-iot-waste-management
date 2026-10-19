import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../infrastructure/database/database.module';
import { type DrizzleClient } from '../../infrastructure/database/db';
import {
  vehicles,
  NewVehicle,
  UpdateVehicle,
  Vehicle,
} from './vehicles.schema';

@Injectable()
export class VehiclesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleClient) {}

  async findAll(limit: number, offset: number): Promise<Vehicle[]> {
    return this.db
      .select()
      .from(vehicles)
      .orderBy(vehicles.createdAt)
      .limit(limit)
      .offset(offset);
  }

  async findById(id: string): Promise<Vehicle | undefined> {
    const result = await this.db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, id))
      .limit(1);
    return result[0];
  }

  async findByUserCode(userCode: string): Promise<Vehicle | undefined> {
    const result = await this.db
      .select()
      .from(vehicles)
      .where(eq(vehicles.userCode, userCode))
      .limit(1);
    return result[0];
  }

  async create(vehicle: NewVehicle): Promise<Vehicle> {
    const result = await this.db.insert(vehicles).values(vehicle).returning();
    return result[0];
  }

  async update(
    id: string,
    vehicle: UpdateVehicle,
  ): Promise<Vehicle | undefined> {
    const result = await this.db
      .update(vehicles)
      .set(vehicle)
      .where(eq(vehicles.id, id))
      .returning();
    return result[0];
  }

  async delete(id: string): Promise<Vehicle | undefined> {
    const result = await this.db
      .delete(vehicles)
      .where(eq(vehicles.id, id))
      .returning();
    return result[0];
  }
}
