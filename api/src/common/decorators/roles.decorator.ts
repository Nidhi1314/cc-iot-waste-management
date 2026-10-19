import { SetMetadata } from '@nestjs/common';
import { VehicleRole } from '../../modules/vehicles/vehicles.schema';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: VehicleRole[]) => SetMetadata(ROLES_KEY, roles);
