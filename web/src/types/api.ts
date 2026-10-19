export type UserRole = 'ADMIN' | 'DRIVER';

export type AuthUser = {
  id: string;
  userCode: string;
  role: UserRole;
};

export type LoginRequest = {
  userCode: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};

export type BinStatus = 'ACTIVE' | 'DAMAGED' | 'OUT_OF_SERVICE';

export type SmartBin = {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
  totalDepthCm: number;
  maxCapacityKg: number;
  status: BinStatus;
  currentFillLevel: number;
  needsCollection: boolean;
  lastUpdated: string;
};

export type VehiclePublic = {
  id: string;
  userCode: string;
  role: UserRole;
  maxCapacityKg: number;
  createdAt: string;
};

export type RouteWaypoint = {
  step: number;
  binId: string;
  collectedKg: number;
};

export type RouteItem = {
  id: string;
  assignedCarId: string | null;
  waypointsOrder: RouteWaypoint[];
  totalDistanceKm: number | null;
  isCompleted: boolean;
  createdAt: string;
};

export type GenerateRouteRequest = {
  assignedCarId: string;
};
