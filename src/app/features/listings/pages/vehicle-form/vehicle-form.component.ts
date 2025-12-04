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
  selectedFile: File | null = null;
  imagePreviewUrl: string | null = null;

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
      pricePerDay: ['', [Validators.required, Validators.min(1)]]
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
      this.isEditMode = true;
      this.currentVehicleId = Number(idParam);

      this.vehicleService.getVehicle(this.currentVehicleId).subscribe(vehicle => {
        if (vehicle.ownerId === this.currentOwnerId) {
          this.vehicleForm.patchValue(vehicle);
          if (vehicle.imageUrl) {
            this.imagePreviewUrl = vehicle.imageUrl;
          }
        } else {
          alert('No tienes permiso para editar este vehículo.');
          this.router.navigate(['/my-vehicles']);
        }
      });
    } else {
      this.isEditMode = false;
    }
  }

  /**
   * @summary Handles file selection from the input and generates a preview
   * @param event - The file input change event
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];

      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreviewUrl = e.target?.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  /**
   * @summary Handles form submission for both create and update operations
   */
  onSubmit(): void {
    if (this.vehicleForm.invalid || this.currentOwnerId === null) return;

    if (!this.isEditMode && !this.selectedFile) {
      alert(this.translate.instant('ERRORS.VEHICLE.IMAGE_REQUIRED') || 'Please select an image for the vehicle.');
      return;
    }

    const formValue = this.vehicleForm.value;

    if (this.isEditMode && this.currentVehicleId) {
      this.vehicleService.update(this.currentVehicleId, this.vehicleForm.value, this.selectedFile || undefined).subscribe(() => {
        alert(this.translate.instant('VEHICLE_FORM.PUBLISH_SUCCESS'));
        this.router.navigate(['/my-vehicles']);
      });
    } else {
      const vehicleData = new Vehicle(
        Date.now(),
        formValue.brand,
        formValue.model,
        formValue.year,
        formValue.pricePerDay,
        'available',
        '',
        this.currentOwnerId
      );

      this.vehicleService.createVehicle(vehicleData, this.selectedFile || undefined).subscribe(() => {
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
        alert(this.translate.instant('VEHICLE.DELETE_ERROR') || 'Error al eliminar el vehículo. Intenta nuevamente.');
      }
    });
  }
}
