export interface Telemetry {
  id: number;
  vehicleId: number;
  latitude: number;
  longitude: number;
  speed: number;
  fuelLevel: number;
  timestamp: string;
  plannedRoute?: number[][]; // Optional: Array of [lat, lng] coordinates for the route
  renterName?: string; // Optional: Name of the person renting the vehicle
}
