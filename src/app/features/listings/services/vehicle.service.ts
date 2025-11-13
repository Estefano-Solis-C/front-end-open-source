import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Vehicle } from '../models/vehicle.model';
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
    return this.http.get<VehicleDto[]>(this.apiUrl).pipe(
      map(dtos => dtos.map(VehicleAssembler.toModel))
    );
  }

  getVehicle(id: number): Observable<Vehicle> {
    return this.http.get<VehicleDto>(`${this.apiUrl}/${id}`).pipe(
      map(dto => VehicleAssembler.toModel(dto))
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

  // Lists vehicles for the authenticated owner
  getMyVehicles(): Observable<Vehicle[]> {
    return this.http.get<VehicleDto[]>(`${this.apiUrl}/my-listings`).pipe(
      map(dtos => dtos.map(VehicleAssembler.toModel))
    );
  }
}
