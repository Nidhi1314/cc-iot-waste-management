import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { eq, asc } from 'drizzle-orm';

import { DRIZZLE } from '../../infrastructure/database/database.module';

import { type DrizzleClient } from '../../infrastructure/database/db';

import { destinations, type Destination } from './destinations.schema';

import {
  type CreateDestinationDto,
  type UpdateDestinationDto,
} from './destinations.dto';

@Injectable()
export class DestinationsService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleClient,
  ) {}

  async findAll(): Promise<Destination[]> {
    return this.db.select().from(destinations).orderBy(asc(destinations.name));
  }

  async findById(id: string): Promise<Destination> {
    const rows = await this.db
      .select()
      .from(destinations)
      .where(eq(destinations.id, id))
      .limit(1);

    if (!rows[0]) {
      throw new NotFoundException(`Destination ${id} not found`);
    }

    return rows[0];
  }

  async create(dto: CreateDestinationDto): Promise<Destination> {
    const rows = await this.db.insert(destinations).values(dto).returning();

    return rows[0];
  }

  async update(id: string, dto: UpdateDestinationDto): Promise<Destination> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('Provide at least one field to update');
    }

    const existing = await this.findById(id);

    // Validate the complete resulting record.
    const type = dto.type ?? existing.type;

    const categories = dto.acceptedCategories ?? existing.acceptedCategories;

    const openFrom = dto.openFrom ?? existing.openFrom;

    const openTo = dto.openTo ?? existing.openTo;

    if (openFrom >= openTo) {
      throw new BadRequestException('Closing time must be after opening time');
    }

    if (
      type === 'LIVESTOCK_FEED' &&
      categories.some((category) => category !== 'VEG_SCRAPS')
    ) {
      throw new BadRequestException(
        'Livestock-feed destinations may only accept VEG_SCRAPS',
      );
    }

    const rows = await this.db
      .update(destinations)
      .set(dto)
      .where(eq(destinations.id, id))
      .returning();

    return rows[0];
  }

  async delete(id: string): Promise<Destination> {
    await this.findById(id);

    const rows = await this.db
      .delete(destinations)
      .where(eq(destinations.id, id))
      .returning();

    return rows[0];
  }
}
