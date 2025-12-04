import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookingService } from '../../services/booking.service';
import { AuthService } from '../../../iam/services/auth.service';
import { UserService } from '../../../iam/services/user.service';
import { take, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { VehicleService } from '../../../listings/services/vehicle.service';
import { Booking } from '../../models/booking.model';
import Vehicle from '../../../listings/models/vehicle.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-booking-requests',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './booking-requests.component.html',
  styleUrls: ['./booking-requests.component.css']
})
/**
 * BookingRequests component lets owners manage incoming booking requests.
 * It aggregates booking, vehicle and renter name for display.
 */
export class BookingRequestsComponent implements OnInit {
  bookingRequests: { booking: Booking; vehicle: Vehicle; renterName: string }[] = [];
  isLoading = true;
  processing: Record<number, boolean> = {};

  constructor(
    private bookingService: BookingService,
    private authService: AuthService,
    private vehicleService: VehicleService,
    private userService: UserService,
    private translate: TranslateService
  ) {}

  /** Load requests plus related vehicles and users */
  ngOnInit(): void {
    this.authService.currentUser$.pipe(take(1)).subscribe(user => {
      if (!user) {
        this.isLoading = false;
        return;
      }

      forkJoin({
        requests: this.bookingService.getMyBookingRequests(),
        vehicles: this.vehicleService.getVehicles(),
        users: this.userService.getUsers()
      })
        .pipe(
          map(({ requests, vehicles, users }) => {
            return (requests || []).map((booking: Booking) => {
              const vehicle = vehicles.find(v => v.id === booking.vehicleId)!;
              const renter = users.find((u: any) => u.id === booking.userId);
              return {
                booking,
                vehicle,
                renterName: renter ? renter.name : 'Unknown User'
              };
            });
          })
        )
        .subscribe({
          next: requests => {
            this.bookingRequests = requests;
            this.isLoading = false;
          },
          error: err => {
            this.isLoading = false;
          }
        });
    });
  }

  /** Confirm a booking request and update local status */
  onConfirm(bookingId: number) {
    this.processing[bookingId] = true;
    this.bookingService.confirmBooking(bookingId).subscribe({
      next: (updated) => {
        const item = this.bookingRequests.find(x => x.booking.id === bookingId);
        if (item) item.booking.status = updated.status || 'CONFIRMED';
        this.processing[bookingId] = false;
      },
      error: err => {
        alert(this.translate.instant('BOOKING_REQUESTS.CONFIRM_ERROR'));
        this.processing[bookingId] = false;
      }
    });
  }

  /** Reject a booking request and update local status */
  onReject(bookingId: number) {
    this.processing[bookingId] = true;
    this.bookingService.rejectBooking(bookingId).subscribe({
      next: (updated) => {
        const item = this.bookingRequests.find(x => x.booking.id === bookingId);
        if (item) item.booking.status = updated.status || 'REJECTED';
        this.processing[bookingId] = false;
      },
      error: err => {
        alert(this.translate.instant('BOOKING_REQUESTS.REJECT_ERROR'));
        this.processing[bookingId] = false;
      }
    });
  }
}
