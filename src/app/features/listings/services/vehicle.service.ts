import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, switchMap, catchError, throwError } from 'rxjs';
import Vehicle from '../models/vehicle.model';
import { VehicleDto } from '../models/vehicle.dto';
import { VehicleAssembler } from '../assemblers/vehicle.assembler';
import { environment } from '../../../../environments/environment';
import { TranslateService } from '@ngx-translate/core';
import { NotificationService } from '../../../shared/infrastructure/notification/notification.service';

interface UserSummary { id: number; name: string; }

@Injectable({
  providedIn: 'root'
})
export class VehicleService {
  private apiUrl = environment.BASE_URL + environment.ENDPOINT_PATH_VEHICLES;
  private usersUrl = environment.BASE_URL + environment.ENDPOINT_PATH_USERS;

  constructor(private http: HttpClient, private translate: TranslateService, private notifier: NotificationService) {}

  /** @summary Retrieve all vehicles with owner names */
  getVehicles(): Observable<Vehicle[]> {
    const vehicles$ = this.http.get<VehicleDto[]>(this.apiUrl);
    const users$ = this.http.get<UserSummary[]>(this.usersUrl);

    return forkJoin({ vehicles: vehicles$, users: users$ }).pipe(
      map(({ vehicles, users }) =>
        vehicles.map(vehicleDto => {
          const model = VehicleAssembler.toModel(vehicleDto);
          const owner = users.find(u => u.id === model.ownerId);
          model.ownerName = owner ? owner.name : this.translate.instant('LISTINGS.UNKNOWN_OWNER');
          return model;
        })
      ),
      catchError(err => {
        this.notifier.showError('ERRORS.VEHICLE.LIST_FETCH_FAILED');
        return throwError(() => err);
      })
    );
  }

  /** @summary Retrieve a single vehicle enriched with owner name */
  getVehicle(id: number): Observable<Vehicle> {
    return this.http.get<VehicleDto>(`${this.apiUrl}/${id}`).pipe(
      switchMap((vehicleDto: VehicleDto) =>
        this.http.get<UserSummary[]>(this.usersUrl).pipe(
          map(users => {
            const vehicleModel = VehicleAssembler.toModel(vehicleDto);
            const owner = users.find(u => u.id === vehicleModel.ownerId);
            vehicleModel.ownerName = owner ? owner.name : this.translate.instant('LISTINGS.UNKNOWN_OWNER');
            return vehicleModel;
          })
        )
      ),
      catchError(err => {
        this.notifier.showError('ERRORS.VEHICLE.DETAIL_FETCH_FAILED');
        return throwError(() => err);
      })
    );
  }

  /** @summary Retrieves listings owned by the authenticated user */
  getMyListings(): Observable<Vehicle[]> {
    return this.http.get<VehicleDto[]>(`${this.apiUrl}/my-listings`).pipe(
      map(dtos => dtos.map(VehicleAssembler.toModel)),
      catchError(err => {
        this.notifier.showError('ERRORS.VEHICLE.MY_LISTINGS_FETCH_FAILED');
        return throwError(() => err);
      })
    );
  }

  /**
   * @summary Create a new vehicle with optional image file upload
   * @param vehicle - The vehicle domain model
   * @param imageFile - Optional image file to upload
   * @returns Observable of the created vehicle
   */
  createVehicle(vehicle: Vehicle, imageFile?: File): Observable<Vehicle> {
    if (imageFile) {
      const formData = new FormData();
      const dto = VehicleAssembler.toDto(vehicle);
      formData.append('resource', new Blob([JSON.stringify(dto)], { type: 'application/json' }));
      formData.append('image', imageFile);

      return this.http.post<VehicleDto>(this.apiUrl, formData).pipe(
        map(newDto => VehicleAssembler.toModel(newDto)),
        catchError(err => {
          this.notifier.showError('ERRORS.VEHICLE.CREATE_FAILED');
          return throwError(() => err);
        })
      );
    } else {
      const dto = VehicleAssembler.toDto(vehicle);
      return this.http.post<VehicleDto>(this.apiUrl, dto).pipe(
        map(newDto => VehicleAssembler.toModel(newDto)),
        catchError(err => {
          this.notifier.showError('ERRORS.VEHICLE.CREATE_FAILED');
          return throwError(() => err);
        })
      );
    }
  }

  /**
   * @summary Update a vehicle with optional image file upload
   * @param id - The vehicle ID
   * @param resource - The vehicle resource object (form data)
   * @param imageFile - Optional image file to upload (if not provided, keeps existing image)
   * @returns Observable of the updated vehicle
   */
  update(id: number, resource: any, imageFile?: File): Observable<any> {
    const formData = new FormData();
    formData.append('resource', new Blob([JSON.stringify(resource)], { type: 'application/json' }));

    if (imageFile) {
      formData.append('image', imageFile);
    }

    return this.http.put<VehicleDto>(`${this.apiUrl}/${id}`, formData).pipe(
      map(updatedDto => VehicleAssembler.toModel(updatedDto)),
      catchError(err => {
        this.notifier.showError('ERRORS.VEHICLE.UPDATE_FAILED');
        return throwError(() => err);
      })
    );
  }

  /**
   * @deprecated Use `update()` instead
   * @summary Update a vehicle with optional image file upload
   * @param vehicle - The vehicle domain model
   * @param imageFile - Optional image file to upload (if not provided, keeps existing image)
   * @returns Observable of the updated vehicle
   */
  updateVehicle(vehicle: Vehicle, imageFile?: File): Observable<Vehicle> {
    const resource = {
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      pricePerDay: vehicle.pricePerDay,
      status: vehicle.status,
      ownerId: vehicle.ownerId
    };
    return this.update(vehicle.id, resource, imageFile);
  }

  /** @summary Delete a vehicle by id */
  deleteVehicle(vehicleId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${vehicleId}`).pipe(
      catchError(err => {
        this.notifier.showError('ERRORS.VEHICLE.DELETE_FAILED');
        return throwError(() => err);
      })
    );
  }
}
