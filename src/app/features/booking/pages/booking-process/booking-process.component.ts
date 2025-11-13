import { Component, OnInit } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Vehicle } from '../../../listings/models/vehicle.model';
import { VehicleService } from '../../../listings/services/vehicle.service';
import { BookingService } from '../../services/booking.service';
import { AuthService } from '../../../iam/services/auth.service';
import { take } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

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
  isEditMode = false; // Estado para saber si estamos creando o renovando
  private bookingIdToEdit: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private vehicleService: VehicleService,
    private bookingService: BookingService,
    private authService: AuthService
  ) {
    this.bookingForm = this.fb.group({
      startDate: ['', Validators.required],
      endDate: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    const vehicleId = Number(this.route.snapshot.paramMap.get('vehicleId'));
    this.bookingIdToEdit = Number(this.route.snapshot.queryParamMap.get('bookingId'));

    this.vehicleService.getVehicle(vehicleId).subscribe(vehicle => {
      this.vehicle = vehicle;
    });

    // Si la URL contiene un 'bookingId', entramos en modo "renovar"
    if (this.bookingIdToEdit) {
      this.isEditMode = true;
      this.bookingService.getBookingById(this.bookingIdToEdit).subscribe(booking => {
        this.bookingForm.patchValue({
          startDate: formatDate(booking.startDate, 'yyyy-MM-dd', 'en-US'),
          endDate: formatDate(booking.endDate, 'yyyy-MM-dd', 'en-US')
        });
        // En modo renovación, no se puede cambiar la fecha de inicio
        this.bookingForm.get('startDate')?.disable();
        this.calculateTotal();
      });
    }
  }

  calculateTotal() {
    // Usamos .getRawValue() para leer también los campos deshabilitados como startDate
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

  onSubmit() {
    if (this.bookingForm.invalid || !this.vehicle) return;

    if (this.isEditMode && this.bookingIdToEdit) {
      // --- LÓGICA PARA ACTUALIZAR (RENOVAR) ---
      const bookingUpdate = {
        endDate: this.bookingForm.value.endDate,
        totalPrice: this.totalPrice,
      };
      this.bookingService.updateBooking(this.bookingIdToEdit, bookingUpdate).subscribe(() => {
        alert("¡Reserva actualizada con éxito!");
        this.router.navigate(['/my-bookings']);
      });
    } else {
      // --- LÓGICA PARA CREAR (NUEVA RESERVA) ---
      this.authService.currentUser$.pipe(take(1)).subscribe(user => {
        if (!user) {
          alert("Debes iniciar sesión para reservar.");
          this.router.navigate(['/login']);
          return;
        }
        // DTO mínimo para el backend: CreateBookingResource
        const newBooking = {
          vehicleId: this.vehicle!.id,
          startDate: this.bookingForm.value.startDate,
          endDate: this.bookingForm.value.endDate
        };
        this.bookingService.createBooking(newBooking).subscribe(() => {
          alert("¡Reserva confirmada con éxito!");
          this.router.navigate(['/my-bookings']);
        });
      });
    }
  }
}
