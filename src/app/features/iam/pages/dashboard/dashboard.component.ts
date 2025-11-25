import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookingService } from '../../../booking/services/booking.service';
import { AuthService } from '../../services/auth.service';
import { RouterModule } from '@angular/router';
import { take, switchMap, of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  totalIncome = 0;
  activeRentals = 0;
  totalVehicles = 0;
  topVehicles: any[] = [];
  isLoading = true;

  constructor(
    private bookingService: BookingService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.pipe(
      switchMap(user => user ? this.bookingService.getMyBookingRequests() : of([]))
    ).subscribe(data => {
      this.calculateMetrics(data);
      this.isLoading = false;
    });
  }

  calculateMetrics(bookings: any[]) {
    this.totalIncome = bookings.reduce((sum, booking) => sum + (booking.totalPrice || 0), 0);
    this.activeRentals = bookings.filter(b => b.status === 'active').length;
    const uniqueVehicles = new Set(bookings.map(b => b.vehicle?.id).filter((v: number | undefined) => v != null));
    this.totalVehicles = uniqueVehicles.size;

    const vehicleCounts: Record<number, number> = bookings.reduce((acc: Record<number, number>, booking: any) => {
      const vid = booking.vehicle?.id;
      if (vid != null) acc[vid] = (acc[vid] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    this.topVehicles = bookings
      .filter((booking, index, self) => booking.vehicle && self.findIndex(b => b.vehicle?.id === booking.vehicle.id) === index)
      .map(b => ({ ...b.vehicle, rentalCount: vehicleCounts[b.vehicle.id] }))
      .sort((a, b) => b.rentalCount - a.rentalCount)
      .slice(0, 3);
  }
}
