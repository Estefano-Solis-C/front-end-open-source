import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { VehicleService } from '../../services/vehicle.service';
import { AuthService } from '../../../iam/services/auth.service';
import Vehicle from '../../models/vehicle.model';
import { take } from 'rxjs';
import { TranslateModule, TranslateService, TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-vehicle-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, TranslatePipe],
  templateUrl: './vehicle-form.component.html',
  styleUrls: ['./vehicle-form.component.css']
})
export class VehicleFormComponent implements OnInit {
  vehicleForm: FormGroup;
  isEditMode = false;
  currentOwnerId: number | null = null;
  currentVehicleId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private vehicleService: VehicleService,
    private authService: AuthService,
    private translate: TranslateService
  ) {
    this.vehicleForm = this.fb.group({
      brand: ['', Validators.required],
      model: ['', Validators.required],
      year: ['', [Validators.required, Validators.min(2000)]],
      pricePerDay: ['', [Validators.required, Validators.min(1)]],
      imageUrl: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.authService.currentUser$.pipe(take(1)).subscribe(user => {
      if (user) {
        this.currentOwnerId = user.id;
      }
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      // EDIT MODE
      this.isEditMode = true;
      this.currentVehicleId = Number(idParam);

      this.vehicleService.getVehicle(this.currentVehicleId).subscribe(vehicle => {
        // Ensure current user owns the vehicle
        if (vehicle.ownerId === this.currentOwnerId) {
          this.vehicleForm.patchValue(vehicle);
        } else {
          alert('No tienes permiso para editar este vehículo.');
          this.router.navigate(['/my-vehicles']);
        }
      });
    } else {
      // CREATE MODE
      this.isEditMode = false;
    }
  }

  onSubmit() {
    if (this.vehicleForm.invalid || this.currentOwnerId === null) return;

    const formValue = this.vehicleForm.value;

    if (this.isEditMode && this.currentVehicleId) {
      // UPDATE LOGIC
      const vehicleData = new Vehicle(
        this.currentVehicleId,
        formValue.brand,
        formValue.model,
        formValue.year,
        formValue.pricePerDay,
        'available',
        formValue.imageUrl,
        this.currentOwnerId
      );

      this.vehicleService.updateVehicle(vehicleData).subscribe(() => {
        alert(this.translate.instant('VEHICLE_FORM.PUBLISH_SUCCESS'));
        this.router.navigate(['/my-vehicles']);
      });
    } else {
      // CREATE LOGIC
      const vehicleData = new Vehicle(
        Date.now(),
        formValue.brand,
        formValue.model,
        formValue.year,
        formValue.pricePerDay,
        'available',
        formValue.imageUrl,
        this.currentOwnerId
      );

      this.vehicleService.createVehicle(vehicleData).subscribe(() => {
        alert(this.translate.instant('VEHICLE_FORM.PUBLISH_SUCCESS'));
        this.router.navigate(['/my-vehicles']);
      });
    }
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
        console.error('Error deleting vehicle', err);
        alert(this.translate.instant('VEHICLE.DELETE_ERROR') || 'Error al eliminar el vehículo. Intenta nuevamente.');
      }
    });
  }
}
