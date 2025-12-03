import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Telemetry } from '../models/telemetry.model';
import { environment } from '../../../../environments/environment';

export interface RouteResponse {
  route: Array<{ lat: number; lng: number }>;
}

@Injectable({
  providedIn: 'root'
})
export class TelemetryService {
  private apiUrl = environment.BASE_URL + environment.ENDPOINT_PATH_TELEMETRY;
  private simulationUrl = environment.BASE_URL + '/simulation';

  constructor(private http: HttpClient) { }

  /**
   * Obtiene los datos de telemetría de un vehículo específico
   * @param vehicleId ID del vehículo
   * @returns Observable con array de datos de telemetría
   */
  getTelemetryByVehicleId(vehicleId: number): Observable<Telemetry[]> {
    return this.http.get<Telemetry[]>(`${this.apiUrl}/vehicle/${vehicleId}`);
  }

  /**
   * Obtiene la última telemetría registrada para un vehículo
   * @param vehicleId ID del vehículo
   * @returns Observable con el último dato de telemetría
   */
  getLatestTelemetry(vehicleId: number): Observable<Telemetry> {
    return this.http.get<Telemetry>(`${this.apiUrl}/vehicle/${vehicleId}/latest`);
  }

  /**
   * Obtiene una ruta simulada entre dos coordenadas
   * Endpoint: GET /api/v1/simulation/route?startLat=X&startLng=Y&endLat=X&endLng=Y
   * @param startLat Latitud de inicio
   * @param startLng Longitud de inicio
   * @param endLat Latitud de destino
   * @param endLng Longitud de destino
   * @returns Observable con la ruta simulada (array de coordenadas)
   */
  getSimulationRoute(startLat: number, startLng: number, endLat: number, endLng: number): Observable<RouteResponse> {
    // Construir parámetros de consulta
    const params = new HttpParams()
      .set('startLat', startLat.toString())
      .set('startLng', startLng.toString())
      .set('endLat', endLat.toString())
      .set('endLng', endLng.toString());

    // Hacer petición GET con parámetros en query string
    return this.http.get<RouteResponse>(`${this.simulationUrl}/route`, { params });
  }
}
