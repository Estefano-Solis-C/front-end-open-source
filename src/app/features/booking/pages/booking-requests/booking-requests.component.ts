import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookingService } from '../../services/booking.service';
import { AuthService } from '../../../iam/services/auth.service';
import { take, forkJoin, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { VehicleService } from '../../../listings/services/vehicle.service';
import { Booking } from '../../models/booking.model';
import { Vehicle } from '../../../listings/models/vehicle.model';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-booking-requests',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './booking-requests.component.html',
  styleUrls: ['./booking-requests.component.css']
})
export class BookingRequestsComponent implements OnInit {
  // Cambiado: ahora cada item contiene la reserva y su vehículo
  bookingRequests: { booking: Booking; vehicle: Vehicle }[] = [];
  isLoading = true;
  // control simple de acciones en curso por bookingId
  processing: Record<number, boolean> = {};

  constructor(
    private bookingService: BookingService,
    private authService: AuthService,
    private vehicleService: VehicleService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.pipe(take(1)).subscribe(user => {
      if (!user) {
        this.isLoading = false;
        return;
      }

      this.bookingService.getMyBookingRequests().pipe(
        switchMap((bookings: Booking[]) => {
          if (!bookings || bookings.length === 0) return of([] as { booking: Booking; vehicle: Vehicle }[]);
          const requests$ = bookings.map(b =>
            this.vehicleService.getVehicle(b.vehicleId).pipe(
              map(vehicle => ({ booking: b, vehicle }))
            )
          );
          return forkJoin(requests$);
        })
      ).subscribe({
        next: (requests) => {
          this.bookingRequests = requests;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error cargando solicitudes', err);
          this.isLoading = false;
        }
      });
    });
  }

  onConfirm(bookingId: number) {
    this.processing[bookingId] = true;
    this.bookingService.confirmBooking(bookingId).subscribe({
      next: (updated) => {
        // actualizar estado en memoria
        const item = this.bookingRequests.find(x => x.booking.id === bookingId);
        if (item) item.booking.status = updated.status || 'CONFIRMED';
        this.processing[bookingId] = false;
      },
      error: (err) => {
        console.error('Error confirmando reserva', err);
        alert('No se pudo confirmar la reserva.');
        this.processing[bookingId] = false;
      }
    });
  }

  onReject(bookingId: number) {
    this.processing[bookingId] = true;
    this.bookingService.rejectBooking(bookingId).subscribe({
      next: (updated) => {
        const item = this.bookingRequests.find(x => x.booking.id === bookingId);
        if (item) item.booking.status = updated.status || 'REJECTED';
        this.processing[bookingId] = false;
      },
      error: (err) => {
        console.error('Error rechazando reserva', err);
        alert('No se pudo rechazar la reserva.');
        this.processing[bookingId] = false;
      }
    });
  }
}
