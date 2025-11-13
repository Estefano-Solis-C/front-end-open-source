import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { take } from 'rxjs';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './edit-profile.component.html',
  styleUrls: ['./edit-profile.component.css']
})
export class EditProfileComponent implements OnInit {
  infoForm: FormGroup;
  passwordForm: FormGroup;
  currentUser: User | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    // Formulario para la información personal
    this.infoForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
      // Puedes añadir más campos como teléfono, etc. si los tienes en tu modelo User
    });

    // Formulario para cambiar la contraseña
    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.authService.currentUser$.pipe(take(1)).subscribe(user => {
      if (user) {
        this.currentUser = user;
        // Rellenamos el formulario con los datos actuales del usuario
        this.infoForm.patchValue({
          name: user.name,
          email: user.email
        });
      }
    });
  }

  onUpdateInformation(): void {
    if (this.infoForm.invalid || !this.currentUser) {
      alert('Por favor, completa los campos correctamente.');
      return;
    }

    // Creamos el objeto de usuario actualizado
    const updatedUser: User = {
      ...this.currentUser,
      name: this.infoForm.value.name,
      email: this.infoForm.value.email
    };

    this.authService.updateUser(updatedUser).subscribe({
      next: () => {
        alert('Información actualizada con éxito.');
        this.router.navigate(['/profile']);
      },
      error: (err) => {
        console.error('Error al actualizar la información:', err);
        alert('Hubo un error al actualizar tus datos.');
      }
    });
  }

  onChangePassword(): void {
    if (this.passwordForm.invalid) {
      alert('Por favor, completa todos los campos de contraseña.');
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;

    if (newPassword !== confirmPassword) {
      alert('La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    // Aquí iría la lógica para verificar la contraseña actual y cambiarla.
    // Como estamos usando json-server, simularemos que la operación fue exitosa.
    console.log('Cambiando contraseña...');
    alert('Contraseña cambiada con éxito (simulación).');
    this.passwordForm.reset();
  }
}
