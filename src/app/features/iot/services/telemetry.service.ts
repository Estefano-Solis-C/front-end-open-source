import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { Telemetry } from '../models/telemetry.model';
import { environment } from '../../../../environments/environment';
import { TranslateService } from '@ngx-translate/core';
import { NotificationService } from '../../../shared/infrastructure/notification/notification.service';

interface RouteCoordinate {
  lat: number;
  lng: number;
}

/**
 * @summary DTO to create a new telemetry record
 */
export interface TelemetryCreateDto {
  vehicleId: number;
  latitude: number;
  longitude: number;
  speed: number;
  fuelLevel: number;
  timestamp?: string; // Optional, backend may generate it
}

@Injectable({
  providedIn: 'root'
})
export class TelemetryService {
  private apiUrl = environment.BASE_URL + environment.ENDPOINT_PATH_TELEMETRY;
  private simulationUrl = environment.BASE_URL + '/simulation';

  constructor(private http: HttpClient, private translate: TranslateService, private notifier: NotificationService) { }

  /**
   * @summary Get telemetry data for a specific vehicle
   * @param vehicleId vehicle id
   * @returns Observable with telemetry array
   */
  getTelemetryByVehicleId(vehicleId: number): Observable<Telemetry[]> {
    return this.http.get<Telemetry[]>(`${this.apiUrl}/vehicle/${vehicleId}`).pipe(
      catchError(err => {
        this.notifier.showError('ERRORS.TELEMETRY.LIST_FETCH_FAILED');
        return throwError(() => err);
      })
    );
  }

  /**
   * @summary Get the latest telemetry for a vehicle
   * @param vehicleId vehicle id
   */
  getLatestTelemetry(vehicleId: number): Observable<Telemetry> {
    return this.http.get<Telemetry>(`${this.apiUrl}/vehicle/${vehicleId}/latest`).pipe(
      catchError(err => {
        this.notifier.showError('ERRORS.TELEMETRY.DETAIL_FETCH_FAILED');
        return throwError(() => err);
      })
    );
  }

  /**
   * @summary Get a simulated route between two coordinates
   * GET /api/v1/simulation/route?startLat=X&startLng=Y&endLat=X&endLng=Y
   */
  getSimulationRoute(startLat: number, startLng: number, endLat: number, endLng: number): Observable<RouteCoordinate[]> {
    const params = new HttpParams()
      .set('startLat', startLat.toString())
      .set('startLng', startLng.toString())
      .set('endLat', endLat.toString())
      .set('endLng', endLng.toString());

    return this.http.get<RouteCoordinate[]>(`${this.simulationUrl}/route`, { params }).pipe(
      catchError(err => {
        this.notifier.showError('ERRORS.TELEMETRY.ROUTE_FETCH_FAILED');
        return throwError(() => err);
      })
    );
  }

  /**
   * @summary Record a new telemetry entry manually
   * POST /api/v1/telemetry
   */
  recordTelemetry(data: TelemetryCreateDto): Observable<Telemetry> {
    const payload: TelemetryCreateDto = {
      ...data,
      timestamp: data.timestamp || new Date().toISOString()
    };

    return this.http.post<Telemetry>(this.apiUrl, payload).pipe(
      catchError(err => {
        this.notifier.showError('ERRORS.TELEMETRY.CREATE_FAILED');
        return throwError(() => err);
      })
    );
  }
}
