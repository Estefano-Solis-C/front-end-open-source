import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { switchMap } from 'rxjs';
import { Booking } from '../../models/booking.model';
import { Vehicle } from '../../../listings/models/vehicle.model';
import { BookingService } from '../../services/booking.service';
import { VehicleService } from '../../../listings/services/vehicle.service';
import { ReviewListComponent } from '../../../reviews/components/review-list/review-list.component';
import { ReviewFormComponent } from '../../../reviews/components/review-form/review-form.component';
import { TranslateModule } from '@ngx-translate/core'; // Importar

@Component({
  selector: 'app-booking-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe, ReviewListComponent, ReviewFormComponent, TranslateModule], // Añadir
  templateUrl: './booking-detail.component.html',
  styleUrls: ['./booking-detail.component.css']
})
export class BookingDetailComponent implements OnInit {
  @ViewChild(ReviewListComponent) private reviewList!: ReviewListComponent;

  booking: Booking | undefined;
  vehicle: Vehicle | undefined;
  daysRemaining: number | undefined;
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bookingService: BookingService,
    private vehicleService: VehicleService
  ) {}

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

  onReviewPosted(): void {
    alert('¡Gracias por tu opinión!');
    if (this.reviewList) {
      this.reviewList.loadReviews();
    }
  }

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

  cancelBooking(): void {
    if (this.booking && confirm('¿Estás seguro de que deseas cancelar esta reserva?')) {
      this.bookingService.cancelBooking(this.booking.id).subscribe({
        next: () => {
          alert('Reserva cancelada con éxito. Ahora puedes dejar una reseña si lo deseas.');
          if (this.booking) {
            this.booking.status = 'cancelada';
          }
        },
        error: (err) => {
          console.error('Error al cancelar la reserva:', err);
          alert('No se pudo cancelar la reserva. Inténtalo de nuevo.');
        }
      });
    }
  }

  renewBooking(): void {
    if (this.booking) {
      // Navegamos al proceso de reserva, pero ahora pasamos el ID de la reserva
      // para indicar que es un modo de "edición" o "renovación".
      this.router.navigate(['/booking', this.booking.vehicleId], { queryParams: { bookingId: this.booking.id } });
    }
  }

  // --- NUEVO MÉTODO ---
  deleteBooking(): void {
    if (this.booking && confirm('¿Estás seguro de que deseas eliminar permanentemente esta reserva del historial?')) {
      this.bookingService.deleteBooking(this.booking.id).subscribe({
        next: () => {
          alert('La reserva ha sido eliminada.');
          this.router.navigate(['/my-bookings']); // Redirigir a la lista de reservas
        },
        error: (err) => {
          console.error('Error al eliminar la reserva:', err);
          alert('No se pudo eliminar la reserva.');
        }
      });
    }
  }
}
