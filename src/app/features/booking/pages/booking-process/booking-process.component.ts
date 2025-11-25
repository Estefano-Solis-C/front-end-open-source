import { Component, OnInit } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import Vehicle from '../../../listings/models/vehicle.model';
import { VehicleService } from '../../../listings/services/vehicle.service';
import { BookingService } from '../../services/booking.service';
import { AuthService } from '../../../iam/services/auth.service';
import { take } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

/**
 * BookingProcess component handles creating or renewing a booking.
 * When bookingId is present it enters renewal (edit) mode.
 */
@Component({
  selector: 'app-booking-process',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './booking-process.component.html',
  styleUrls: ['./booking-process.component.css']
})
export class BookingProcessComponent implements OnInit {
  vehicle: Vehicle | undefined;
  bookingForm: FormGroup;
  totalPrice = 0;
  totalDays = 0;
  isEditMode = false;
  private bookingIdToEdit: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private vehicleService: VehicleService,
    private bookingService: BookingService,
    private authService: AuthService,
    private translate: TranslateService
  ) {
    this.bookingForm = this.fb.group({
      startDate: ['', Validators.required],
      endDate: ['', Validators.required]
    });
  }

  /** Initialize component, load vehicle and optionally existing booking */
  ngOnInit(): void {
    const vehicleId = Number(this.route.snapshot.paramMap.get('vehicleId'));
    this.bookingIdToEdit = Number(this.route.snapshot.queryParamMap.get('bookingId'));

    this.vehicleService.getVehicle(vehicleId).subscribe(vehicle => {
      this.vehicle = vehicle;
    });

    if (this.bookingIdToEdit) {
      this.isEditMode = true;
      this.bookingService.getBookingById(this.bookingIdToEdit).subscribe(booking => {
        this.bookingForm.patchValue({
          startDate: formatDate(booking.startDate, 'yyyy-MM-dd', 'en-US'),
          endDate: formatDate(booking.endDate, 'yyyy-MM-dd', 'en-US')
        });
        this.bookingForm.get('startDate')?.disable();
        this.calculateTotal();
      });
    }
  }

  /** Recalculate total days and price based on selected dates */
  calculateTotal() {
    const startDate = new Date(this.bookingForm.getRawValue().startDate);
    const endDate = new Date(this.bookingForm.value.endDate);
    if (this.vehicle && startDate && endDate && endDate > startDate) {
      const timeDiff = endDate.getTime() - startDate.getTime();
      this.totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
      this.totalPrice = this.totalDays * this.vehicle.pricePerDay;
    } else {
      this.totalDays = 0;
      this.totalPrice = 0;
    }
  }

  /** Submit create or renew operation based on current mode */
  onSubmit() {
    if (this.bookingForm.invalid || !this.vehicle) return;

    if (this.isEditMode && this.bookingIdToEdit) {
      const bookingUpdate = {
        endDate: this.bookingForm.value.endDate,
        totalPrice: this.totalPrice,
      };
      this.bookingService.updateBooking(this.bookingIdToEdit, bookingUpdate).subscribe(() => {
        alert(this.translate.instant('BOOKING_PROCESS.RENEW_SUCCESS'));
        this.router.navigate(['/my-bookings']);
      });
    } else {
      this.authService.currentUser$.pipe(take(1)).subscribe(user => {
        if (!user) {
          alert(this.translate.instant('BOOKING_PROCESS.LOGIN_REQUIRED'));
          this.router.navigate(['/login']);
          return;
        }
        const newBooking = {
          vehicleId: this.vehicle!.id,
          startDate: this.bookingForm.value.startDate,
          endDate: this.bookingForm.value.endDate
        };
        this.bookingService.createBooking(newBooking).subscribe(() => {
          alert(this.translate.instant('BOOKING_PROCESS.CONFIRM_SUCCESS'));
          this.router.navigate(['/my-bookings']);
        });
      });
    }
  }
}
