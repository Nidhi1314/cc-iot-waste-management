import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type SimulationResult = {
  status: 'success';
  message: string;
  simulated_generators?: number;
};

@Injectable()
export class SimulationService {
  private readonly logger = new Logger(SimulationService.name);
  private readonly algorithmUrl: string;

  constructor(config: ConfigService) {
    this.algorithmUrl = config.getOrThrow<string>('ALGORITHM_URL');
  }

  simulateNextDay(): Promise<SimulationResult> {
    return this.request('/simulate-next-day');
  }

  resetBins(): Promise<SimulationResult> {
    return this.request('/reset-bins');
  }

  private async request(path: string): Promise<SimulationResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(`${this.algorithmUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new ServiceUnavailableException(
          `Simulation service failed with status ${response.status}`,
        );
      }
      const payload: unknown = await response.json();
      if (
        typeof payload !== 'object' ||
        payload === null ||
        !('status' in payload) ||
        payload.status !== 'success' ||
        !('message' in payload) ||
        typeof payload.message !== 'string'
      ) {
        this.logger.error('Simulation service returned an invalid response');
        throw new ServiceUnavailableException(
          'Simulation service returned an invalid response',
        );
      }
      return {
        status: 'success',
        message: payload.message,
        ...('simulated_generators' in payload &&
        typeof payload.simulated_generators === 'number'
          ? { simulated_generators: payload.simulated_generators }
          : {}),
      };
    } catch (error: unknown) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error(
        `Simulation service request failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new ServiceUnavailableException(
        'Simulation service is unavailable. Please try again later.',
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
