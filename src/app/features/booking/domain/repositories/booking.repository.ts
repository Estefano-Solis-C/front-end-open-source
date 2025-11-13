import { Observable } from 'rxjs';
import { Booking } from '../../models/booking.model';

export interface IBookingRepository {
  getMyBookings(): Observable<Booking[]>;
  getMyBookingRequests(): Observable<Booking[]>;
  getBookingById(id: number): Observable<Booking>;
  confirmBooking(bookingId: number): Observable<Booking>;
  rejectBooking(bookingId: number): Observable<Booking>;
  cancelBooking(bookingId: number): Observable<any>;
  deleteBooking(bookingId: number): Observable<any>;
  createBooking(payload: { vehicleId: number; startDate: string; endDate: string }): Observable<Booking>;
}

