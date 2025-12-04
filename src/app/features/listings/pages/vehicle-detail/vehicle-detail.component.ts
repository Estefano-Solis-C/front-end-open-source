import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import Vehicle from '../../models/vehicle.model';
import { VehicleService } from '../../services/vehicle.service';
import { ReviewListComponent } from '../../../reviews/components/review-list/review-list.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { switchMap } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { User } from '../../../iam/models/user.model';
import { AuthService } from '../../../iam/services/auth.service';
import { GetMyBookingsUseCase } from '../../../booking/application/use-cases/get-my-bookings.usecase';
import { Booking } from '../../../booking/models/booking.model';

@Component({
  selector: 'app-vehicle-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ReviewListComponent, TranslateModule],
  templateUrl: './vehicle-detail.component.html',
  styleUrls: ['./vehicle-detail.component.css']
})
export class VehicleDetailComponent implements OnInit {
  vehicle: Vehicle | undefined;
  currentUser: User | null = null;
  hasActiveBooking = false;
  isOwner = false;
  isLoadingData = true;
  currentVehicleId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private vehicleService: VehicleService,
    private translate: TranslateService,
    private authService: AuthService,
    private getMyBookings: GetMyBookingsUseCase,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    this.route.paramMap.pipe(
      switchMap(params => {
        const id = Number(params.get('id'));
        if (!id) return of(null);
        return forkJoin({
          vehicle: this.vehicleService.getVehicle(id),
          bookings: this.currentUser ? this.getMyBookings.execute() : of([] as Booking[])
        });
      })
    ).subscribe(result => {
      if (result) {
        const { vehicle, bookings } = result;
        if (!vehicle.ownerName || vehicle.ownerName.trim() === '') {
          vehicle.ownerName = this.translate.instant('VEHICLE.UNKNOWN_OWNER');
        }
        this.vehicle = vehicle;
        this.currentVehicleId = vehicle.id;
        this.isOwner = this.currentUser?.id === this.vehicle.ownerId;
        this.hasActiveBooking = bookings.some(b =>
          b.vehicleId === this.vehicle!.id && (b.status === 'PENDING' || b.status === 'CONFIRMED')
        );
      }
      this.isLoadingData = false;
    });
  }

  onDelete() {
    if (!this.currentVehicleId) return;

    const confirmed = confirm('¿Estás seguro de que deseas eliminar este vehículo y todos sus datos asociados? Esta acción no se puede deshacer.');
    if (!confirmed) return;

    this.vehicleService.deleteVehicle(this.currentVehicleId).subscribe({
      next: () => {
        alert(this.translate.instant('VEHICLE.DELETE_SUCCESS') || 'Vehículo eliminado correctamente.');
        this.router.navigate(['/my-vehicles']);
      },
      error: (err) => {
        alert(this.translate.instant('VEHICLE.DELETE_ERROR') || 'Error al eliminar el vehículo. Intenta nuevamente.');
      }
    });
  }
}
