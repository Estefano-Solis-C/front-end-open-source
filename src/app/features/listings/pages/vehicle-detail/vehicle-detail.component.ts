import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Vehicle } from '../../models/vehicle.model';
import { VehicleService } from '../../services/vehicle.service';
import { ReviewListComponent } from '../../../reviews/components/review-list/review-list.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { map, switchMap } from 'rxjs';

@Component({
  selector: 'app-vehicle-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ReviewListComponent, TranslateModule],
  templateUrl: './vehicle-detail.component.html',
  styleUrls: ['./vehicle-detail.component.css']
})
export class VehicleDetailComponent implements OnInit {
  vehicle: Vehicle | undefined;

  constructor(
    private route: ActivatedRoute,
    private vehicleService: VehicleService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap(params => {
        const id = Number(params.get('id'));
        // 1. Obtenemos el vehículo y aplicamos fallback para ownerName si no viene
        return this.vehicleService.getVehicle(id).pipe(
          map(vehicle => {
            if (!vehicle.ownerName || vehicle.ownerName.trim() === '') {
              vehicle.ownerName = this.translate.instant('VEHICLE.UNKNOWN_OWNER');
            }
            return vehicle;
          })
        );
      })
    ).subscribe(vehicle => {
      this.vehicle = vehicle;
    });
  }
}
