import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, map, Observable } from 'rxjs';
import { Vehicle } from '../../../listings/models/vehicle.model';
import { Booking } from '../../../booking/models/booking.model';
import { VehicleService } from '../../../listings/services/vehicle.service';
import { AuthService } from '../../services/auth.service';
import { TranslateModule } from '@ngx-translate/core';
import { GetMyBookingsUseCase } from '../../../booking/application/use-cases/get-my-bookings.usecase';

@Component({
  selector: 'app-dashboard-arrendatario',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './dashboard-arrendatario.component.html',
  styleUrls: ['./dashboard-arrendatario.component.css']
})
export class DashboardArrendatarioComponent implements OnInit {
  isLoading = true;
  previewVehicles: Vehicle[] = [];
  // Active bookings shown in the dashboard
  activeBookings: { booking: Booking, vehicle: Vehicle }[] = [];

  // Filtered observables for the dashboard
  availableVehicles$!: Observable<Vehicle[]>;
  activeBookings$!: Observable<{ booking: Booking, vehicle: Vehicle }[]>;

  constructor(
    private vehicleService: VehicleService,
    private getMyBookings: GetMyBookingsUseCase,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.isLoading = false;
      return;
    }
    // Only load renter-specific data for renters
    if (currentUser.role !== 'ROLE_ARRENDATARIO') {
      this.isLoading = false;
      return;
    }

    // 1) availableVehicles$: only vehicles with status 'available'
    this.availableVehicles$ = this.vehicleService.getVehicles().pipe(
      map(vehicles => vehicles.filter(vehicle => vehicle.status === 'available'))
    );

    // 2) activeBookings$: bookings with status PENDING/CONFIRMED joined with their vehicles
    this.activeBookings$ = forkJoin({
      vehicles: this.vehicleService.getVehicles(),
      bookings: this.getMyBookings.execute()
    }).pipe(
      map(({ vehicles, bookings }) => {
        const filteredBookings = bookings
          .filter(b => b.status === 'PENDING' || b.status === 'CONFIRMED')
          .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

        return filteredBookings
          .map(booking => {
            const vehicleForBooking = vehicles.find(v => v.id === booking.vehicleId);
            return vehicleForBooking ? { booking, vehicle: vehicleForBooking } : null;
          })
          .filter((item): item is { booking: Booking, vehicle: Vehicle } => item !== null);
      })
    );

    // Additional preview logic (kept): builds a small preview list
    forkJoin({
      vehicles: this.vehicleService.getVehicles(),
      bookings: this.getMyBookings.execute()
    }).pipe(
      map(({ vehicles, bookings }) => {
        const availableVehicles = vehicles.filter(v => v.status === 'available').slice(0, 3);

        const allActiveBookings = bookings
          .filter(b => b.status === 'PENDING' || b.status === 'CONFIRMED')
          .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

        const activeBookingsWithDetails = allActiveBookings.map(booking => {
          const vehicleForBooking = vehicles.find(v => v.id === booking.vehicleId);
          return vehicleForBooking ? { booking, vehicle: vehicleForBooking } : null;
        }).filter(item => item !== null) as { booking: Booking, vehicle: Vehicle }[];

        return { previewVehicles: availableVehicles, activeBookings: activeBookingsWithDetails };
      })
    ).subscribe(({ previewVehicles, activeBookings }) => {
      this.previewVehicles = previewVehicles;
      this.activeBookings = activeBookings;
      this.isLoading = false;
    });
  }
}
