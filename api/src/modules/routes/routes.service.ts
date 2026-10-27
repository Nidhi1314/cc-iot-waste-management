import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ZodError } from 'zod';
import { RoutesRepository } from './routes.repository';
import { BinsService } from '../bins/bins.service';
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
          waypointsOrder: waypoints,
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
