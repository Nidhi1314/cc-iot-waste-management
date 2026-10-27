import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, isNotNull, sql, sum } from 'drizzle-orm';
import { DRIZZLE } from '../../infrastructure/database/database.module';
import { type DrizzleClient } from '../../infrastructure/database/db';
import { smartBins } from '../bins/bins.schema';
import { destinations } from '../destinations/destinations.schema';
import { routes } from '../routes/routes.schema';
import { vehicles } from '../vehicles/vehicles.schema';
import { collections, type Collection } from './collections.schema';
import {
  type ConfirmDeliveryDto,
  type CreateCollectionDto,
} from './collections.dto';

@Injectable()
export class CollectionsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleClient) {}

  async findAll(): Promise<Collection[]> {
    return this.db
      .select()
      .from(collections)
      .orderBy(desc(collections.collectedAt))
      .limit(200);
  }

  async create(dto: CreateCollectionDto): Promise<Collection> {
    const [bin] = await this.db
      .select()
      .from(smartBins)
      .where(eq(smartBins.id, dto.binId))
      .limit(1);
    if (!bin) throw new NotFoundException(`Generator ${dto.binId} not found`);

    const [destination] = await this.db
      .select({
        id: destinations.id,
        active: destinations.active,
        acceptedCategories: destinations.acceptedCategories,
      })
      .from(destinations)
      .where(eq(destinations.id, dto.destinationId))
      .limit(1);
    if (!destination || !destination.active) {
      throw new BadRequestException('Select an active delivery destination');
    }
    if (
      !bin.wasteCategory ||
      !destination.acceptedCategories.includes(bin.wasteCategory)
    ) {
      throw new BadRequestException(
        'The selected destination does not accept this generator waste category',
      );
    }

    if (dto.routeId) {
      const [route] = await this.db
        .select()
        .from(routes)
        .where(eq(routes.id, dto.routeId))
        .limit(1);
      if (!route) throw new NotFoundException(`Route ${dto.routeId} not found`);
      if (route.destinationId !== dto.destinationId) {
        throw new BadRequestException(
          'The collection destination must match the route destination',
        );
      }
      if (!route.waypointsOrder.some((waypoint) => waypoint.binId === bin.id)) {
        throw new BadRequestException('Generator is not on the selected route');
      }
      if (route.assignedCarId) {
        const [vehicle] = await this.db
          .select({ maxCapacityKg: vehicles.maxCapacityKg })
          .from(vehicles)
          .where(eq(vehicles.id, route.assignedCarId))
          .limit(1);
        const [recorded] = await this.db
          .select({ total: sum(collections.measuredKg) })
          .from(collections)
          .where(eq(collections.routeId, dto.routeId));
        if (
          vehicle &&
          Number(recorded?.total ?? 0) + dto.measuredKg > vehicle.maxCapacityKg
        ) {
          throw new BadRequestException(
            'Recorded load would exceed the assigned vehicle capacity',
          );
        }
      }
    }

    const [created] = await this.db
      .insert(collections)
      .values({
        binId: dto.binId,
        routeId: dto.routeId,
        destinationId: dto.destinationId,
        measuredKg: dto.measuredKg,
        contaminationPercent: dto.contaminationPercent,
        collectedAt: dto.collectedAt ? new Date(dto.collectedAt) : new Date(),
      })
      .returning();

    await this.db
      .update(smartBins)
      .set({
        currentFillLevel: 0,
        needsCollection: false,
        fillStartedAt: null,
        lastCollectedAt: created.collectedAt,
        lastUpdated: created.collectedAt,
      })
      .where(eq(smartBins.id, dto.binId));

    return created;
  }

  async confirmDelivery(
    id: string,
    dto: ConfirmDeliveryDto,
  ): Promise<Collection> {
    const [existing] = await this.db
      .select()
      .from(collections)
      .where(eq(collections.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException(`Collection ${id} not found`);
    if (existing.status === 'DELIVERED') {
      throw new BadRequestException('This collection is already delivered');
    }
    const deliveredAt = dto.deliveredAt
      ? new Date(dto.deliveredAt)
      : new Date();
    if (deliveredAt < existing.collectedAt) {
      throw new BadRequestException(
        'Delivery time cannot be earlier than collection time',
      );
    }
    const [destination] = await this.db
      .select()
      .from(destinations)
      .where(eq(destinations.id, existing.destinationId))
      .limit(1);
    if (!destination?.active) {
      throw new BadRequestException('The delivery destination is inactive');
    }
    const todayStart = this.getDelhiDayStart(deliveredAt);
    const [dailyTotal] = await this.db
      .select({ total: sum(collections.measuredKg) })
      .from(collections)
      .where(
        and(
          eq(collections.destinationId, destination.id),
          eq(collections.status, 'DELIVERED'),
          isNotNull(collections.deliveredAt),
          sql`${collections.deliveredAt} >= ${todayStart}`,
        ),
      );
    if (
      Number(dailyTotal?.total ?? 0) + existing.measuredKg >
      destination.dailyCapacityKg
    ) {
      throw new BadRequestException(
        'Confirming this delivery would exceed the destination daily capacity',
      );
    }

    const [updated] = await this.db
      .update(collections)
      .set({
        status: 'DELIVERED',
        deliveredAt,
      })
      .where(and(eq(collections.id, id), eq(collections.status, 'COLLECTED')))
      .returning();
    if (!updated)
      throw new BadRequestException(
        'Delivery status changed; reload and retry',
      );
    return updated;
  }

  async getImpactSummary() {
    const [deliveries] = await this.db
      .select({
        deliveredKg: sum(collections.measuredKg),
        avgContaminationPercent: sql<number>`avg(${collections.contaminationPercent})`,
        confirmedDeliveries: count(),
      })
      .from(collections)
      .where(isNotNull(collections.deliveredAt));

    const [tripSummary] = await this.db
      .select({
        completedTrips: count(),
        totalDistanceKm: sum(routes.totalDistanceKm),
      })
      .from(routes)
      .where(eq(routes.isCompleted, true));

    const [pending] = await this.db
      .select({ count: count() })
      .from(collections)
      .where(eq(collections.status, 'COLLECTED'));

    return {
      deliveredKg: Number(deliveries?.deliveredKg ?? 0),
      avgContaminationPercent: Number(deliveries?.avgContaminationPercent ?? 0),
      confirmedDeliveries: deliveries?.confirmedDeliveries ?? 0,
      completedTrips: tripSummary?.completedTrips ?? 0,
      totalDistanceKm: Number(tripSummary?.totalDistanceKm ?? 0),
      pendingDeliveries: pending?.count ?? 0,
    };
  }

  private getDelhiDayStart(date: Date): Date {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
    return new Date(`${parts}T00:00:00+05:30`);
  }
}
