import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, switchMap } from 'rxjs';
import Vehicle from '../models/vehicle.model';
import { VehicleDto } from '../models/vehicle.dto';
import { VehicleAssembler } from '../assemblers/vehicle.assembler';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class VehicleService {
  private apiUrl = environment.BASE_URL + environment.ENDPOINT_PATH_VEHICLES;
  private usersUrl = environment.BASE_URL + environment.ENDPOINT_PATH_USERS;

  constructor(private http: HttpClient) {}

  getVehicles(): Observable<Vehicle[]> {
    const vehicles$ = this.http.get<VehicleDto[]>(this.apiUrl);
    const users$ = this.http.get<any[]>(this.usersUrl);

    return forkJoin({ vehicles: vehicles$, users: users$ }).pipe(
      map(({ vehicles, users }) =>
        vehicles.map(vehicleDto => {
          const model = VehicleAssembler.toModel(vehicleDto);
          const owner = users.find(u => u.id === model.ownerId);
          model.ownerName = owner ? owner.name : 'Propietario Desconocido';
          return model;
        })
      )
    );
  }

  getVehicle(id: number): Observable<Vehicle> {
    return this.http.get<VehicleDto>(`${this.apiUrl}/${id}`).pipe(
      switchMap((vehicleDto: VehicleDto) =>
        this.http.get<any[]>(this.usersUrl).pipe(
          map(users => {
            const vehicleModel = VehicleAssembler.toModel(vehicleDto);
            const owner = users.find(u => u.id === vehicleModel.ownerId);
            vehicleModel.ownerName = owner ? owner.name : 'Propietario Desconocido';
            return vehicleModel;
          })
        )
      )
    );
  }

  // Retrieves listings owned by the authenticated user
  getMyListings(): Observable<Vehicle[]> {
    return this.http.get<VehicleDto[]>(`${this.apiUrl}/my-listings`).pipe(
      map(dtos => dtos.map(VehicleAssembler.toModel))
    );
  }

  createVehicle(vehicle: Vehicle): Observable<Vehicle> {
    const dto = VehicleAssembler.toDto(vehicle);
    return this.http.post<VehicleDto>(this.apiUrl, dto).pipe(
      map(newDto => VehicleAssembler.toModel(newDto))
    );
  }

  updateVehicle(vehicle: Vehicle): Observable<Vehicle> {
    const dto = VehicleAssembler.toDto(vehicle);
    return this.http.put<VehicleDto>(`${this.apiUrl}/${vehicle.id}`, dto).pipe(
      map(updatedDto => VehicleAssembler.toModel(updatedDto))
    );
  }

  getMyVehicles(): Observable<Vehicle[]> {
    return this.http.get<VehicleDto[]>(`${this.apiUrl}/my-listings`).pipe(
      map(dtos => dtos.map(VehicleAssembler.toModel))
    );
  }

  /** Delete a vehicle by id */
  deleteVehicle(vehicleId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${vehicleId}`);
  }
}
