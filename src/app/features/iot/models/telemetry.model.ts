export interface Telemetry {
  id: number;
  vehicleId: number;
  latitude: number;
  longitude: number;
  speed: number;
  fuelLevel: number;
  timestamp: string;
  renterName?: string;
  plannedRoute?: Array<{ lat: number; lng: number }>;
}
