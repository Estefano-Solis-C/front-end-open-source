import { Routes } from '@angular/router';
import { MainLayoutComponent } from './shared/components/main-layout/main-layout.component';
import { VehicleListComponent } from './features/listings/pages/vehicle-list/vehicle-list.component';
import { VehicleDetailComponent } from './features/listings/pages/vehicle-detail/vehicle-detail.component';
import { MyBookingsComponent } from './features/booking/pages/my-bookings/my-bookings.component';
import { LoginComponent } from './features/iam/pages/login/login.component';
import { RegisterComponent } from './features/iam/pages/register/register.component';
import { MyVehiclesComponent } from './features/listings/pages/my-vehicles/my-vehicles.component';
import { TrackingComponent } from './features/iot/pages/tracking/tracking.component';
import { BookingProcessComponent } from './features/booking/pages/booking-process/booking-process.component';
import { VehicleFormComponent } from './features/listings/pages/vehicle-form/vehicle-form.component';
import { BookingRequestsComponent } from './features/booking/pages/booking-requests/booking-requests.component';
import { ProfileComponent } from './features/iam/pages/profile/profile.component';
import { authGuard } from './core/guards/auth.guard';
import { BookingDetailComponent } from './features/booking/pages/booking-detail/booking-detail.component';
import { DashboardArrendatarioComponent } from './features/iam/pages/dashboard-arrendatario/dashboard-arrendatario.component';
import { roleGuard } from './core/guards/role.guard';
import { defaultRedirectGuard } from './core/guards/default-redirect.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardArrendatarioComponent, canActivate: [roleGuard], data: { roles: ['ROLE_ARRENDATARIO'] } },
      { path: 'vehicles', component: VehicleListComponent },
      { path: 'vehicles/:id', component: VehicleDetailComponent },
      { path: 'booking/:vehicleId', component: BookingProcessComponent, canActivate: [roleGuard], data: { roles: ['ROLE_ARRENDATARIO'] } },
      { path: 'my-bookings', component: MyBookingsComponent, canActivate: [roleGuard], data: { roles: ['ROLE_ARRENDATARIO'] } },
      { path: 'my-bookings/:id', component: BookingDetailComponent, canActivate: [roleGuard], data: { roles: ['ROLE_ARRENDATARIO'] } },
      { path: 'my-vehicles', component: MyVehiclesComponent, canActivate: [roleGuard], data: { roles: ['ROLE_ARRENDADOR'] } },
      { path: 'publish-vehicle', component: VehicleFormComponent, canActivate: [roleGuard], data: { roles: ['ROLE_ARRENDADOR'] } },
      { path: 'edit-vehicle/:id', component: VehicleFormComponent, canActivate: [roleGuard], data: { roles: ['ROLE_ARRENDADOR'] } },
      { path: 'booking-requests', component: BookingRequestsComponent, canActivate: [roleGuard], data: { roles: ['ROLE_ARRENDADOR'] } },
      { path: 'profile', component: ProfileComponent },
      { path: 'tracking/:id', component: TrackingComponent },
    ]
  },
  { path: '**', redirectTo: '' }
];
