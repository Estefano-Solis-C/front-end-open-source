import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { Booking } from '../models/booking.model';
import { BookingDto } from '../models/booking.dto';
import { BookingAssembler } from '../assemblers/booking.assembler';
import { VehicleService } from '../../listings/services/vehicle.service';
import { environment } from '../../../../environments/environment';
import { IBookingRepository } from '../domain/repositories/booking.repository';
import { TranslateService } from '@ngx-translate/core';
import { NotificationService } from '../../../shared/infrastructure/notification/notification.service';

@Injectable({
  providedIn: 'root'
})
export class BookingService implements IBookingRepository {
  private apiUrl = environment.BASE_URL + environment.ENDPOINT_PATH_BOOKINGS;

  constructor(
    private http: HttpClient,
    private vehicleService: VehicleService,
    private translate: TranslateService,
    private notifier: NotificationService
  ) {}

  /** @summary Retrieve booking by id */
  getBookingById(id: number): Observable<Booking> {
    return this.http.get<BookingDto>(`${this.apiUrl}/${id}`).pipe(
      map(dto => BookingAssembler.toModel(dto)),
      catchError(err => {
        this.notifier.showError('ERRORS.BOOKING.DETAIL_FETCH_FAILED');
        return throwError(() => err);
      })
    );
  }

  /** @summary Update booking */
  updateBooking(bookingId: number, bookingDto: Partial<BookingDto>): Observable<Booking> {
    return this.http.put<BookingDto>(`${this.apiUrl}/${bookingId}`, bookingDto).pipe(
      map(dto => BookingAssembler.toModel(dto)),
      catchError(err => {
        this.notifier.showError('ERRORS.BOOKING.UPDATE_FAILED');
        return throwError(() => err);
      })
    );
  }

  /** @summary Confirm a booking (owner) */
  confirmBooking(id: number): Observable<Booking> {
    return this.http.put<BookingDto>(`${this.apiUrl}/${id}/confirm`, {}).pipe(
      map(dto => BookingAssembler.toModel(dto)),
      catchError(err => {
        this.notifier.showError('ERRORS.BOOKING.CONFIRM_FAILED');
        return throwError(() => err);
      })
    );
  }

  /** @summary Reject a booking (owner) */
  rejectBooking(id: number): Observable<Booking> {
    return this.http.put<BookingDto>(`${this.apiUrl}/${id}/reject`, {}).pipe(
      map(dto => BookingAssembler.toModel(dto)),
      catchError(err => {
        this.notifier.showError('ERRORS.BOOKING.REJECT_FAILED');
        return throwError(() => err);
      })
    );
  }

  /** @summary Cancel a booking */
  cancelBooking(id: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/cancel`, {}).pipe(
      catchError(err => {
        this.notifier.showError('ERRORS.BOOKING.CANCEL_FAILED');
        return throwError(() => err);
      })
    );
  }

  /** @summary Delete a booking */
  deleteBooking(bookingId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${bookingId}`).pipe(
      catchError(err => {
        this.notifier.showError('ERRORS.BOOKING.DELETE_FAILED');
        return throwError(() => err);
      })
    );
  }

  /** @summary Retrieve my bookings (alias) */
  getMyBookings(): Observable<Booking[]> {
    return this.http.get<BookingDto[]>(`${this.apiUrl}/my-bookings`).pipe(
      map(dtos => dtos.map(BookingAssembler.toModel)),
      catchError(err => {
        this.notifier.showError('ERRORS.BOOKING.LIST_FETCH_FAILED');
        return throwError(() => err);
      })
    );
  }

  /** @summary Create a booking */
  createBooking(payload: { vehicleId: number; startDate: string; endDate: string }): Observable<Booking> {
    return this.http.post<BookingDto>(this.apiUrl, payload).pipe(
      map(dto => BookingAssembler.toModel(dto)),
      catchError(err => {
        this.notifier.showError('ERRORS.BOOKING.CREATE_FAILED');
        return throwError(() => err);
      })
    );
  }

  /** @summary Retrieve booking requests for my vehicles */
  getMyBookingRequests(): Observable<Booking[]> {
    return this.http.get<BookingDto[]>(`${this.apiUrl}/my-requests`).pipe(
      map(dtos => dtos.map(BookingAssembler.toModel)),
      catchError(err => {
        this.notifier.showError('ERRORS.BOOKING.REQUESTS_FETCH_FAILED');
        return throwError(() => err);
      })
    );
  }
}
