import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin, switchMap, map as rxMap } from 'rxjs';
import { map } from 'rxjs/operators';
import { Booking } from '../models/booking.model';
import { BookingDto } from '../models/booking.dto';
import { BookingAssembler } from '../assemblers/booking.assembler';
import { VehicleService } from '../../listings/services/vehicle.service';
import { environment } from '../../../../environments/environment';
import { IBookingRepository } from '../domain/repositories/booking.repository';

@Injectable({
  providedIn: 'root'
})
export class BookingService implements IBookingRepository {
  private apiUrl = environment.BASE_URL + environment.ENDPOINT_PATH_BOOKINGS;
  private usersUrl = environment.BASE_URL + environment.ENDPOINT_PATH_USERS;
  private vehiclesUrl = environment.BASE_URL + environment.ENDPOINT_PATH_VEHICLES;

  constructor(
    private http: HttpClient,
    private vehicleService: VehicleService
  ) {}

  // Retrieves bookings for the authenticated renter
  getBookings(): Observable<Booking[]> {
    return this.http.get<BookingDto[]>(`${this.apiUrl}/my-bookings`).pipe(
      map(dtos => dtos.map(BookingAssembler.toModel))
    );
  }

  getBookingById(id: number): Observable<Booking> {
    return this.http.get<BookingDto>(`${this.apiUrl}/${id}`).pipe(
      map(dto => BookingAssembler.toModel(dto))
    );
  }

  updateBooking(bookingId: number, bookingDto: Partial<BookingDto>): Observable<Booking> {
    return this.http.patch<BookingDto>(`${this.apiUrl}/${bookingId}`, bookingDto).pipe(
      map(dto => BookingAssembler.toModel(dto))
    );
  }

  // Confirms a booking (owner)
  confirmBooking(id: number): Observable<Booking> {
    return this.http.put<BookingDto>(`${this.apiUrl}/${id}/confirm`, {}).pipe(
      map(dto => BookingAssembler.toModel(dto))
    );
  }

  // Rejects a booking (owner)
  rejectBooking(id: number): Observable<Booking> {
    return this.http.put<BookingDto>(`${this.apiUrl}/${id}/reject`, {}).pipe(
      map(dto => BookingAssembler.toModel(dto))
    );
  }

  cancelBooking(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/cancel`, {});
  }

  deleteBooking(bookingId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${bookingId}`);
  }

  // DDD repository contract method alias
  getMyBookings(): Observable<Booking[]> {
    return this.http.get<BookingDto[]>(`${this.apiUrl}/my-bookings`).pipe(
      map(dtos => dtos.map(BookingAssembler.toModel))
    );
  }

  // Creates a booking sending only vehicleId, startDate and endDate
  createBooking(payload: { vehicleId: number; startDate: string; endDate: string }): Observable<Booking> {
    return this.http.post<BookingDto>(this.apiUrl, payload).pipe(
      map(dto => BookingAssembler.toModel(dto))
    );
  }

  // Owner requests endpoint
  getMyBookingRequests(): Observable<Booking[]> {
    return this.http.get<BookingDto[]>(`${this.apiUrl}/my-requests`).pipe(
      map(dtos => dtos.map(BookingAssembler.toModel))
    );
  }
}
