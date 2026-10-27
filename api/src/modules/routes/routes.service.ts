import {
  BadRequestException,
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ZodError } from 'zod';
import { RoutesRepository } from './routes.repository';
import { BinsService } from '../bins/bins.service';
import { DestinationsService } from '../destinations/destinations.service';
import { SettingsService } from '../settings/settings.service';
import { vehicles } from '../vehicles/vehicles.schema';
import { collections } from '../collections/collections.schema';
import { DRIZZLE } from '../../infrastructure/database/database.module';
import { type DrizzleClient } from '../../infrastructure/database/db';
import { and, eq, gte, isNotNull, sum } from 'drizzle-orm';
import { Route, Waypoint } from './routes.schema';
import {
  GenerateRouteDto,
  algorithmResponseSchema,
  directionsRequestSchema,
  directionsResponseSchema,
  type AlgorithmResponse,
  type DirectionsRequestDto,
} from './routes.dto';

const DEFAULT_ALGORITHM_TIMEOUT_MS = 8000;
const DEFAULT_ROUTE_VALIDATION_MODE = 'monitor';
type RouteValidationMode = 'monitor' | 'enforce';

@Injectable()
export class RoutesService {
  private readonly logger = new Logger(RoutesService.name);
  private readonly algorithmUrl: string;
  private readonly algorithmTimeoutMs: number;
  private readonly routeValidationMode: RouteValidationMode;
  private readonly orsApiKey: string;

  constructor(
    private readonly routesRepository: RoutesRepository,
    private readonly binsService: BinsService,
    private readonly configService: ConfigService,
    private readonly destinationsService: DestinationsService,
    private readonly settingsService: SettingsService,
    @Inject(DRIZZLE) private readonly db: DrizzleClient,
  ) {
    this.algorithmUrl = this.configService.getOrThrow<string>('ALGORITHM_URL');
    this.orsApiKey = this.configService.get<string>('ORS_API_KEY') ?? '';
    this.algorithmTimeoutMs = Number(
      this.configService.get<string>('ALGORITHM_TIMEOUT_MS') ??
        String(DEFAULT_ALGORITHM_TIMEOUT_MS),
    );
    this.routeValidationMode = this.getRouteValidationMode();
  }

  async findAll(limit: number, offset: number): Promise<Route[]> {
    return this.routesRepository.findAll(limit, offset);
  }

  async findById(id: string): Promise<Route> {
    const route = await this.routesRepository.findById(id);

    if (!route) {
      throw new NotFoundException(`Route with id "${id}" not found`);
    }

    return route;
  }

  async findActive(): Promise<Route[]> {
    return this.routesRepository.findActive();
  }

  async getDirections(dto: DirectionsRequestDto): Promise<{
    coordinates: [number, number][];
  }> {
    if (!this.orsApiKey) {
      throw new ServiceUnavailableException(
        'Route directions are not configured. Set ORS_API_KEY in the API environment.',
      );
    }

    const request = directionsRequestSchema.parse(dto);
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.algorithmTimeoutMs,
    );

    try {
      const response = await fetch(
        'https://api.heigit.org/openrouteservice/v2/directions/driving-car/geojson',
        {
          method: 'POST',
          headers: {
            Accept: 'application/geo+json, application/json',
            Authorization: this.orsApiKey,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({ coordinates: request.coordinates }),
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(
          `OpenRouteService directions failed with status ${response.status}: ${errorBody.slice(0, 1000)}`,
        );
        throw new ServiceUnavailableException(
          'Route directions service is unavailable. Please try again later.',
        );
      }

      const payload: unknown = await response.json();
      const result = directionsResponseSchema.parse(payload);
      return {
        coordinates: result.features[0].geometry.coordinates,
      };
    } catch (error: unknown) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      if (error instanceof ZodError) {
        this.logger.error(
          `OpenRouteService response contract mismatch: ${error.message}`,
        );
      } else if (error instanceof DOMException && error.name === 'AbortError') {
        this.logger.error(
          `OpenRouteService directions timed out after ${this.algorithmTimeoutMs}ms`,
        );
      } else if (error instanceof Error) {
        this.logger.error(
          `OpenRouteService integration error: ${error.message}`,
        );
      }

      throw new ServiceUnavailableException(
        'Route directions service is unavailable. Please try again later.',
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async generate(dto: GenerateRouteDto): Promise<Route[]> {
    const criticalBins = await this.binsService.findNeedingCollection();

    if (criticalBins.length === 0) {
      throw new BadRequestException('No bins need collection at this time.');
    }

    let algorithmResponse: AlgorithmResponse;

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.algorithmTimeoutMs,
    );

    try {
      const response = await fetch(`${this.algorithmUrl}/optimize-cvrp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          assigned_car_id: dto.assignedCarId,
          bins: criticalBins.map((bin) => ({
            id: bin.id,
            lat: bin.latitude,
            lng: bin.longitude,
            current_fill_level: bin.currentFillLevel,
            max_capacity_kg: bin.maxCapacityKg,
          })),
        }),
      });

      if (!response.ok) {
        throw new ServiceUnavailableException(
          `Route optimization service failed with status ${response.status}`,
        );
      }

      const payload: unknown = await response.json();
      algorithmResponse = algorithmResponseSchema.parse(payload);
    } catch (error: unknown) {
      this.handleAlgorithmError(error);
    } finally {
      clearTimeout(timeout);
    }

    return this.processAlgorithmResponse(algorithmResponse, dto.assignedCarId);
  }

  async generatePredictive(
    dto: GenerateRouteDto,
    hoursAhead: number = 24,
  ): Promise<Route[]> {
    const allBins = await this.binsService.findAll(1000, 0); // Get all bins to predict

    if (allBins.length === 0) {
      throw new BadRequestException('No bins found in the system to predict.');
    }

    let algorithmResponse: AlgorithmResponse;

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.algorithmTimeoutMs,
    );

    try {
      const response = await fetch(`${this.algorithmUrl}/ml/predictive-cvrp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          assigned_car_id: dto.assignedCarId,
          hours_ahead: hoursAhead,
          bins: allBins.map((bin) => ({
            id: bin.id,
            lat: bin.latitude,
            lng: bin.longitude,
            current_fill_level: bin.currentFillLevel,
            max_capacity_kg: bin.maxCapacityKg,
            generator_type: bin.generatorType,
            waste_category: bin.wasteCategory,
            est_daily_kg: bin.estDailyKg,
          })),
        }),
      });

      if (!response.ok) {
        throw new ServiceUnavailableException(
          `Predictive route optimization service failed with status ${response.status}`,
        );
      }

      const payload: unknown = await response.json();
      // Using the same schema since the response format is identical (status, routes[])
      algorithmResponse = algorithmResponseSchema.parse(payload);

      // Optionally log or store predicted_bins_count if returned, but it's not strictly necessary for the schema
    } catch (error: unknown) {
      this.handleAlgorithmError(error);
    } finally {
      clearTimeout(timeout);
    }

    return this.processAlgorithmResponse(algorithmResponse, dto.assignedCarId);
  }

  async generateOrganic(dto: GenerateRouteDto): Promise<Route[]> {
    const [vehicle] = await this.db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, dto.assignedCarId))
      .limit(1);
    if (!vehicle || vehicle.role !== 'DRIVER') {
      throw new BadRequestException('Select a valid driver vehicle');
    }

    const [settings, allDestinations, candidates] = await Promise.all([
      this.settingsService.getSettings(),
      this.destinationsService.findAll(),
      this.binsService.findNeedingCollection(),
    ]);
    const currentTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date());
    const todayStart = this.getDelhiDayStart();
    const usageRows = await this.db
      .select({
        destinationId: collections.destinationId,
        usedKg: sum(collections.measuredKg),
      })
      .from(collections)
      .where(
        and(
          eq(collections.status, 'DELIVERED'),
          isNotNull(collections.deliveredAt),
          gte(collections.deliveredAt, todayStart),
        ),
      )
      .groupBy(collections.destinationId);
    const pendingRows = await this.db
      .select({
        destinationId: collections.destinationId,
        usedKg: sum(collections.measuredKg),
      })
      .from(collections)
      .where(eq(collections.status, 'COLLECTED'))
      .groupBy(collections.destinationId);
    const recordedRouteCollections = await this.db
      .select({
        routeId: collections.routeId,
        binId: collections.binId,
        measuredKg: sum(collections.measuredKg),
      })
      .from(collections)
      .where(isNotNull(collections.routeId))
      .groupBy(collections.routeId, collections.binId);
    const collectedByRoute = new Map<string, Map<string, number>>();
    for (const record of recordedRouteCollections) {
      if (!record.routeId) continue;
      const byBin =
        collectedByRoute.get(record.routeId) ?? new Map<string, number>();
      byBin.set(record.binId, Number(record.measuredKg ?? 0));
      collectedByRoute.set(record.routeId, byBin);
    }
    const activeRoutes = await this.routesRepository.findAll(200, 0);
    const usedCapacity = new Map(
      [...usageRows, ...pendingRows].reduce((totals, row) => {
        totals.set(
          row.destinationId,
          (totals.get(row.destinationId) ?? 0) + Number(row.usedKg ?? 0),
        );
        return totals;
      }, new Map<string, number>()),
    );
    for (const route of activeRoutes) {
      if (!route.isCompleted && route.destinationId) {
        const collectedByBin =
          collectedByRoute.get(route.id) ?? new Map<string, number>();
        const plannedKg = route.waypointsOrder.reduce(
          (total, waypoint) =>
            total +
            Math.max(
              0,
              waypoint.collectedKg - (collectedByBin.get(waypoint.binId) ?? 0),
            ),
          0,
        );
        usedCapacity.set(
          route.destinationId,
          (usedCapacity.get(route.destinationId) ?? 0) + plannedKg,
        );
      }
    }
    const remainingCapacity = new Map(
      allDestinations.map((destination) => [
        destination.id,
        Math.max(
          0,
          destination.dailyCapacityKg - (usedCapacity.get(destination.id) ?? 0),
        ),
      ]),
    );
    const activeDestinations = allDestinations.filter(
      (destination) =>
        destination.active &&
        destination.openFrom <= currentTime &&
        destination.openTo > currentTime,
    );

    const prioritized = candidates
      .filter(
        (bin) =>
          bin.wasteCategory &&
          bin.currentFillLevel > 0 &&
          !activeRoutes.some(
            (route) =>
              !route.isCompleted &&
              route.waypointsOrder.some(
                (waypoint) => waypoint.binId === bin.id,
              ),
          ),
      )
      .sort((left, right) => {
        const agePriority = (fillStartedAt: Date | null) => {
          if (!fillStartedAt) return 0;
          const ageHours =
            (Date.now() - fillStartedAt.getTime()) / (60 * 60 * 1000);
          return ageHours >= settings.maxWasteAgeHours
            ? 1_000_000 + ageHours
            : ageHours;
        };
        const leftAge = agePriority(left.fillStartedAt);
        const rightAge = agePriority(right.fillStartedAt);
        return (
          rightAge - leftAge || right.currentFillLevel - left.currentFillLevel
        );
      });

    const batches = new Map<
      string,
      {
        destination: (typeof activeDestinations)[number];
        bins: typeof candidates;
        loadKg: number;
      }[]
    >();
    for (const bin of prioritized) {
      const estimatedKg = (bin.maxCapacityKg * bin.currentFillLevel) / 100;
      const eligible = activeDestinations
        .filter(
          (destination) =>
            destination.acceptedCategories.includes(bin.wasteCategory!) &&
            (remainingCapacity.get(destination.id) ?? 0) >= estimatedKg,
        )
        .sort(
          (left, right) =>
            this.distanceKm(
              bin.latitude,
              bin.longitude,
              left.latitude,
              left.longitude,
            ) -
            this.distanceKm(
              bin.latitude,
              bin.longitude,
              right.latitude,
              right.longitude,
            ),
        );

      const destination = eligible[0];
      if (!destination) continue;

      const destinationBatches = batches.get(destination.id) ?? [];
      let batch = destinationBatches.find(
        (item) => item.loadKg + estimatedKg <= vehicle.maxCapacityKg,
      );
      if (!batch) {
        batch = { destination, bins: [], loadKg: 0 };
        destinationBatches.push(batch);
      }
      batch.bins.push(bin);
      batch.loadKg += estimatedKg;
      batches.set(destination.id, destinationBatches);
      remainingCapacity.set(
        destination.id,
        (remainingCapacity.get(destination.id) ?? 0) - estimatedKg,
      );
    }

    if (batches.size === 0) {
      throw new BadRequestException(
        'No collection-ready generators fit an active destination and the selected vehicle capacity.',
      );
    }

    const savedRoutes: Route[] = [];
    for (const destinationBatches of batches.values()) {
      for (const batch of destinationBatches) {
        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          this.algorithmTimeoutMs,
        );
        let response: Response;
        try {
          response = await fetch(`${this.algorithmUrl}/optimize-cvrp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              assigned_car_id: dto.assignedCarId,
              vehicle_capacity_kg: vehicle.maxCapacityKg,
              destination: {
                lat: batch.destination.latitude,
                lng: batch.destination.longitude,
              },
              bins: batch.bins.map((bin) => ({
                id: bin.id,
                lat: bin.latitude,
                lng: bin.longitude,
                current_fill_level: bin.currentFillLevel,
                max_capacity_kg: bin.maxCapacityKg,
                priority: bin.fillStartedAt
                  ? Date.now() - bin.fillStartedAt.getTime()
                  : 0,
              })),
            }),
          });
          if (!response.ok) {
            throw new ServiceUnavailableException(
              `Route optimizer failed with status ${response.status}`,
            );
          }
          const optimized = algorithmResponseSchema.parse(
            (await response.json()) as unknown,
          );
          savedRoutes.push(
            ...(await this.processAlgorithmResponse(
              optimized,
              dto.assignedCarId,
              batch.destination.id,
            )),
          );
        } catch (error: unknown) {
          if (error instanceof ServiceUnavailableException) throw error;
          this.handleAlgorithmError(error);
        } finally {
          clearTimeout(timeout);
        }
      }
    }
    return savedRoutes;
  }

  private handleAlgorithmError(error: unknown): never {
    if (error instanceof ZodError) {
      this.logger.error(
        `Algorithm response contract mismatch: ${error.message}`,
      );
    } else if (error instanceof DOMException && error.name === 'AbortError') {
      this.logger.error(
        `Algorithm request timed out after ${this.algorithmTimeoutMs}ms`,
      );
    } else if (error instanceof Error) {
      this.logger.error(`Algorithm integration error: ${error.message}`);
    }

    throw new ServiceUnavailableException(
      'Route optimization service is unavailable. Please try again later.',
    );
  }

  private async processAlgorithmResponse(
    algorithmResponse: AlgorithmResponse,
    requestedCarId: string,
    destinationId?: string,
  ): Promise<Route[]> {
    if (
      algorithmResponse.status === 'info' ||
      algorithmResponse.status === 'error' ||
      !algorithmResponse.routes ||
      algorithmResponse.routes.length === 0
    ) {
      throw new BadRequestException(
        algorithmResponse.message ??
          'Algorithm could not find a valid route or prediction yielded no critical bins.',
      );
    }

    const algorithmRoutes = algorithmResponse.routes;
    const savedRoutes = await Promise.all(
      algorithmRoutes.map(async (vehicleRoute) => {
        const waypoints: Waypoint[] = vehicleRoute.waypoints_order.map((w) => ({
          step: w.step,
          binId: w.bin_id,
          collectedKg: w.collected_kg,
        }));

        this.validateVehicleAssignment(
          requestedCarId,
          vehicleRoute.assigned_car_id,
        );

        return this.routesRepository.create({
          assignedCarId: vehicleRoute.assigned_car_id ?? requestedCarId,
          destinationId,
          waypointsOrder: waypoints,
          totalDistanceKm: vehicleRoute.total_distance_km,
        });
      }),
    );

    if (savedRoutes.some((item) => !item)) {
      throw new ServiceUnavailableException(
        'Failed to persist generated routes',
      );
    }
    return savedRoutes;
  }

  private distanceKm(
    latitudeA: number,
    longitudeA: number,
    latitudeB: number,
    longitudeB: number,
  ): number {
    const radians = (value: number) => (value * Math.PI) / 180;
    const dLat = radians(latitudeB - latitudeA);
    const dLng = radians(longitudeB - longitudeA);
    const arc =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(radians(latitudeA)) *
        Math.cos(radians(latitudeB)) *
        Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc));
  }

  private getDelhiDayStart(): Date {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    return new Date(`${parts}T00:00:00+05:30`);
  }

  async markCompleted(id: string): Promise<Route> {
    await this.findById(id); // throws 404 if not found

    const updated = await this.routesRepository.markCompleted(id);

    if (!updated) {
      throw new NotFoundException(`Route with id "${id}" not found`);
    }

    return updated;
  }

  async delete(id: string): Promise<Route> {
    await this.findById(id); // throws 404 if not found

    const deleted = await this.routesRepository.delete(id);

    if (!deleted) {
      throw new NotFoundException(`Route with id "${id}" not found`);
    }

    return deleted;
  }

  private getRouteValidationMode(): RouteValidationMode {
    const mode =
      this.configService
        .get<string>('ROUTE_ALGO_ASSIGNED_CAR_MODE')
        ?.toLowerCase() ?? DEFAULT_ROUTE_VALIDATION_MODE;

    if (mode === 'enforce' || mode === 'monitor') {
      return mode;
    }

    return DEFAULT_ROUTE_VALIDATION_MODE;
  }

  private validateVehicleAssignment(
    requestedAssignedCarId: string,
    algorithmAssignedCarId: string,
  ): void {
    if (algorithmAssignedCarId === requestedAssignedCarId) {
      return;
    }

    const message =
      'Algorithm assigned car differs from request. Check route generation inputs.';

    if (this.routeValidationMode === 'enforce') {
      throw new BadRequestException(message);
    }

    this.logger.warn(
      `${message} requested=${requestedAssignedCarId}, algorithm=${algorithmAssignedCarId}`,
    );
  }
}
