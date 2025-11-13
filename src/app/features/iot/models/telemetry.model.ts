export interface Telemetry {
  id: number;
  vehicleId: number;
  location: string;
  status: 'En movimiento' | 'Estacionado' | 'Apagado';
}
