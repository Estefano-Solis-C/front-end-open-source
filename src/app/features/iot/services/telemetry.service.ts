import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError } from 'rxjs';
import { Telemetry } from '../models/telemetry.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TelemetryService {
  private apiUrl = environment.BASE_URL + environment.ENDPOINT_PATH_TELEMETRY;
  private vehiclesUrl = environment.BASE_URL + environment.ENDPOINT_PATH_VEHICLES;

  constructor(private http: HttpClient) { }

  getTelemetryByVehicleId(vehicleId: number): Observable<Telemetry> {
    // 1) Intento REST anidado: /vehicles/{id}/telemetry
    return this.http.get<Telemetry>(`${this.vehiclesUrl}/${vehicleId}/telemetry`).pipe(
      // 2) Fallback a query param: /telemetry?vehicleId=
      catchError(() => this.http.get<Telemetry[]>(`${this.apiUrl}?vehicleId=${vehicleId}`).pipe(
        map(telemetryData => telemetryData[0])
      ))
    );
  }
}
