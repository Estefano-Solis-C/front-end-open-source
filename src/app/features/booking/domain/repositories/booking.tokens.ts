import { InjectionToken } from '@angular/core';
import { IBookingRepository } from './booking.repository';

export const BOOKING_REPOSITORY = new InjectionToken<IBookingRepository>('BOOKING_REPOSITORY');

