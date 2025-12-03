import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, map, Observable } from 'rxjs';
import Vehicle from '../../../listings/models/vehicle.model';
import { Booking } from '../../../booking/models/booking.model';
import { VehicleService } from '../../../listings/services/vehicle.service';
import { AuthService } from '../../services/auth.service';
import { TranslateModule } from '@ngx-translate/core';
import { GetMyBookingsUseCase } from '../../../booking/application/use-cases/get-my-bookings.usecase';

/**
 * @summary Dashboard for renter users displaying available vehicles and active bookings.
 * Implements robust filtering with case-insensitive status comparison and flexible ID matching.
 */
@Component({
  selector: 'app-dashboard-arrendatario',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './dashboard-arrendatario.component.html',
  styleUrls: ['./dashboard-arrendatario.component.css']
})
export class DashboardArrendatarioComponent implements OnInit {
  /**
   * @summary Loading state indicator
   */
  isLoading = true;

  /**
   * @summary Preview list of available vehicles (max 3)
   */
  previewVehicles: Vehicle[] = [];

  /**
   * @summary Active bookings with their associated vehicle details
   */
  activeBookings: { booking: Booking, vehicle: Vehicle }[] = [];

  /**
   * @summary Observable stream of available vehicles
   */
  availableVehicles$!: Observable<Vehicle[]>;

  /**
   * @summary Observable stream of active bookings with vehicle details
   */
  activeBookings$!: Observable<{ booking: Booking, vehicle: Vehicle }[]>;

  constructor(
    private vehicleService: VehicleService,
    private getMyBookings: GetMyBookingsUseCase,
    private authService: AuthService
  ) {}

  /**
   * @summary Initializes dashboard data with robust filtering and flexible ID comparison
   */
  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.isLoading = false;
      return;
    }

    if (currentUser.role !== 'ROLE_RENTER') {
      this.isLoading = false;
      return;
    }

    this.availableVehicles$ = this.vehicleService.getVehicles().pipe(
      map(vehicles => vehicles.filter(vehicle =>
        vehicle.status && vehicle.status.toUpperCase() === 'AVAILABLE'
      ))
    );

    this.activeBookings$ = forkJoin({
      vehicles: this.vehicleService.getVehicles(),
      bookings: this.getMyBookings.execute()
    }).pipe(
      map(({ vehicles, bookings }) => {
        const filteredBookings = bookings
          .filter(b => {
            const normalizedStatus = b.status ? b.status.toUpperCase() : '';
            return normalizedStatus === 'PENDING' || normalizedStatus === 'CONFIRMED';
          })
          .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

        return filteredBookings
          .map(booking => {
            const vehicleForBooking = vehicles.find(v =>
              String(v.id) === String(booking.vehicleId)
            );
            return vehicleForBooking ? { booking, vehicle: vehicleForBooking } : null;
          })
          .filter((item): item is { booking: Booking, vehicle: Vehicle } => item !== null);
      })
    );

    forkJoin({
      vehicles: this.vehicleService.getVehicles(),
      bookings: this.getMyBookings.execute()
    }).pipe(
      map(({ vehicles, bookings }) => {
        const availableVehicles = vehicles
          .filter(v => v.status && v.status.toUpperCase() === 'AVAILABLE')
          .slice(0, 3);

        const allActiveBookings = bookings
          .filter(b => {
            const normalizedStatus = b.status ? b.status.toUpperCase() : '';
            return normalizedStatus === 'PENDING' || normalizedStatus === 'CONFIRMED';
          })
          .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

        const activeBookingsWithDetails = allActiveBookings
          .map(booking => {
            const vehicleForBooking = vehicles.find(v =>
              String(v.id) === String(booking.vehicleId)
            );
            return vehicleForBooking ? { booking, vehicle: vehicleForBooking } : null;
          })
          .filter(item => item !== null) as { booking: Booking, vehicle: Vehicle }[];

        return { previewVehicles: availableVehicles, activeBookings: activeBookingsWithDetails };
      })
    ).subscribe(({ previewVehicles, activeBookings }) => {
      this.previewVehicles = previewVehicles;
      this.activeBookings = activeBookings;

      this.isLoading = false;
    });
  }
}
