import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Vehicle } from '../../models/vehicle.model';
import { VehicleService } from '../../services/vehicle.service';
import { map } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core'; // Importar

@Component({
  selector: 'app-vehicle-list',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './vehicle-list.component.html',
  styleUrls: ['./vehicle-list.component.css']
})
export class VehicleListComponent implements OnInit {
  vehicles: Vehicle[] = [];
  availableVehicles: Vehicle[] = [];
  isLoading = true;

  constructor(
    private vehicleService: VehicleService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.vehicleService.getVehicles().pipe(
      map(vehicles => {
        const unknown = this.translate.instant('VEHICLE.UNKNOWN_OWNER');
        vehicles.forEach(v => {
          if (!v.ownerName || v.ownerName.trim() === '') {
            v.ownerName = unknown;
          }
        });
        return vehicles;
      })
    ).subscribe(vehiclesWithOwners => {
      this.vehicles = vehiclesWithOwners;
      this.availableVehicles = vehiclesWithOwners.filter(v => (v.status || '').toLowerCase() === 'available');
      this.isLoading = false;
    });
  }
}
