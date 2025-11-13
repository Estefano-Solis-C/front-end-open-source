import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { VehicleService } from '../../services/vehicle.service';
import { AuthService } from '../../../iam/services/auth.service';
import { Vehicle } from '../../models/vehicle.model';
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
      if (user) this.currentOwnerId = user.id;
    });

    // Lógica para modo edición (a implementar en el futuro si se necesita)
    // const id = this.route.snapshot.paramMap.get('id');
    // if (id) { ... }
  }

  onSubmit() {
    if (this.vehicleForm.invalid || this.currentOwnerId === null) return;

    const formValue = this.vehicleForm.value;

    const vehicleData = new Vehicle(
      Date.now(), // ID temporal
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
