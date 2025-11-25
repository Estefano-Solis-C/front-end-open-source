import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { switchMap } from 'rxjs';
import { Booking } from '../../models/booking.model';
import Vehicle from '../../../listings/models/vehicle.model';
import { BookingService } from '../../services/booking.service';
import { VehicleService } from '../../../listings/services/vehicle.service';
import { ReviewListComponent } from '../../../reviews/components/review-list/review-list.component';
import { ReviewFormComponent } from '../../../reviews/components/review-form/review-form.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

/**
 * Component that displays detailed information for a single booking,
 * including vehicle data, remaining days, status and review interactions.
 */
@Component({
  selector: 'app-booking-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe, ReviewListComponent, ReviewFormComponent, TranslateModule],
  templateUrl: './booking-detail.component.html',
  styleUrls: ['./booking-detail.component.css']
})
export class BookingDetailComponent implements OnInit {
  @ViewChild(ReviewListComponent) private reviewList!: ReviewListComponent;

  /** Active booking loaded from backend */
  booking!: Booking;
  /** Vehicle associated with the booking */
  vehicle!: Vehicle;
  /** Number of days remaining until the booking end date */
  daysRemaining: number = 0;
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bookingService: BookingService,
    private vehicleService: VehicleService,
    private translate: TranslateService
  ) {}

  /**
   * Initializes component state by fetching booking and its vehicle.
   */
  ngOnInit(): void {
    const bookingId = Number(this.route.snapshot.paramMap.get('id'));
    if (bookingId) {
      this.bookingService.getBookingById(bookingId).pipe(
        switchMap(booking => {
          this.booking = booking;
          this.daysRemaining = this.calculateDaysRemaining(booking.endDate);
          return this.vehicleService.getVehicle(booking.vehicleId);
        })
      ).subscribe(vehicle => {
        this.vehicle = vehicle;
        this.isLoading = false;
      });
    }
  }

  /**
   * Handler invoked after a review is posted; shows a thank-you message and reloads reviews.
   */
  onReviewPosted(): void {
    alert(this.translate.instant('REVIEW_FORM.THANK_YOU'));
    if (this.reviewList) {
      this.reviewList.loadReviews();
    }
  }

  /**
   * Calculates remaining whole days between today and the provided end date.
   * @param endDate Booking end date.
   * @returns Remaining days (minimum 0).
   */
  private calculateDaysRemaining(endDate: Date): number {
    const today = new Date();
    const end = new Date(endDate);
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const timeDiff = end.getTime() - today.getTime();
    if (timeDiff < 0) {
      return 0;
    }
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  /**
   * Attempts to cancel the current booking after user confirmation.
   * Updates local status to CANCELED on success.
   */
  cancelBooking(): void {
    if (this.booking && confirm(this.translate.instant('BOOKING_DETAIL.CONFIRM_CANCEL'))) {
      this.bookingService.cancelBooking(this.booking.id).subscribe({
        next: () => {
          alert(this.translate.instant('BOOKING_DETAIL.CANCEL_SUCCESS'));
          if (this.booking) {
            this.booking.status = 'CANCELED';
          }
        },
        error: (err) => {
          console.error('Error al cancelar la reserva:', err);
          alert(this.translate.instant('BOOKING_DETAIL.CANCEL_ERROR'));
        }
      });
    }
  }

  /**
   * Navigates to the booking process in renew mode for the current booking.
   */
  renewBooking(): void {
    if (this.booking) {
      this.router.navigate(['/booking', this.booking.vehicleId], { queryParams: { bookingId: this.booking.id } });
    }
  }

  /**
   * Permanently deletes the booking after user confirmation and redirects to list.
   */
  deleteBooking(): void {
    if (this.booking && confirm(this.translate.instant('BOOKING_DETAIL.CONFIRM_DELETE'))) {
      this.bookingService.deleteBooking(this.booking.id).subscribe({
        next: () => {
          alert(this.translate.instant('BOOKING_DETAIL.DELETE_SUCCESS'));
          this.router.navigate(['/my-bookings']);
        },
        error: (err) => {
          console.error('Error al eliminar la reserva:', err);
          alert(this.translate.instant('BOOKING_DETAIL.DELETE_ERROR'));
        }
      });
    }
  }
}
