import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Booking } from '../../models/booking.model';
import { AuthService } from '../../../iam/services/auth.service';
import { VehicleService } from '../../../listings/services/vehicle.service';
import { switchMap, of, forkJoin, map, take } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { GetMyBookingsUseCase } from '../../../booking/application/use-cases/get-my-bookings.usecase';
import { BookingService } from '../../services/booking.service';

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './my-bookings.component.html',
  styleUrls: ['./my-bookings.component.css']
})
export class MyBookingsComponent implements OnInit {
  bookingsWithDetails: any[] = [];
  isLoading = true;

  constructor(
    private getMyBookings: GetMyBookingsUseCase,
    private authService: AuthService,
    private vehicleService: VehicleService,
    private bookingService: BookingService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.pipe(
      take(1),
      switchMap(user => {
        if (user && user.role === 'ROLE_RENTER') {
          return this.getMyBookings.execute();
        }
        return of([]);
      }),
      switchMap(bookings => {
        if (bookings.length === 0) {
          return of([]);
        }
        const vehicleRequests = bookings.map(booking =>
          this.vehicleService.getVehicle(booking.vehicleId).pipe(
            map(vehicle => ({
              booking: booking,
              vehicle: vehicle,
              daysRemaining: this.calculateDaysRemaining(booking.endDate)
            }))
          )
        );
        return forkJoin(vehicleRequests);
      })
    ).subscribe(detailedBookings => {
      this.bookingsWithDetails = detailedBookings;
      this.isLoading = false;
    });
  }

  private calculateDaysRemaining(endDate: Date): number {
    const today = new Date();
    const end = new Date(endDate);
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const timeDiff = end.getTime() - today.getTime();
    if (timeDiff < 0) return 0;
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  cancelBooking(bookingId: number): void {
    this.bookingService.cancelBooking(bookingId).subscribe({
      next: () => {
        this.bookingsWithDetails = this.bookingsWithDetails.filter(
          item => item.booking.id !== bookingId
        );
      },
      error: (err) => {
      }
    });
  }
}
