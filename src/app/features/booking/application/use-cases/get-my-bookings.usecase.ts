import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Booking } from '../../models/booking.model';
import { BOOKING_REPOSITORY } from '../../domain/repositories/booking.tokens';
import { IBookingRepository } from '../../domain/repositories/booking.repository';

/**
 * Use case: Retrieve the authenticated renter's bookings.
 * - Input: none (user identity is derived from the auth token on the backend).
 * - Output: Observable<Booking[]>.
 */
@Injectable({ providedIn: 'root' })
export class GetMyBookingsUseCase {
  constructor(@Inject(BOOKING_REPOSITORY) private readonly repo: IBookingRepository) {}

  execute(): Observable<Booking[]> {
    return this.repo.getMyBookings();
  }
}
