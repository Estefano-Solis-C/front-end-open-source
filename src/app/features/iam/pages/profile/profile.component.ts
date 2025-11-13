import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Observable, take } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { TranslateModule } from '@ngx-translate/core'; // Importar

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  currentUser$: Observable<User | null>;
  currentUser: User | null = null;

  infoForm: FormGroup;
  passwordForm: FormGroup; // Formulario para la contraseña
  isEditMode = false;

  constructor(
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.currentUser$ = this.authService.currentUser$;

    this.infoForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
    });

    // Inicializamos el formulario de contraseña
    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.currentUser$.pipe(take(1)).subscribe(user => {
      if (user) {
        this.currentUser = user;
        this.infoForm.patchValue({
          name: user.name,
          email: user.email
        });
      }
    });
  }

  enterEditMode(): void {
    this.isEditMode = true;
  }

  cancelEditMode(): void {
    this.isEditMode = false;
    if (this.currentUser) {
      this.infoForm.patchValue({
        name: this.currentUser.name,
        email: this.currentUser.email
      });
    }
  }

  onUpdateInformation(): void {
    if (this.infoForm.invalid || !this.currentUser) return;

    const updatedUser: User = { ...this.currentUser, ...this.infoForm.value };

    this.authService.updateUser(updatedUser).subscribe({
      next: () => {
        alert('Información actualizada con éxito.');
        this.isEditMode = false;
      },
      error: () => alert('Hubo un error al actualizar tus datos.')
    });
  }

  // --- MÉTODO CORREGIDO ---
  // Llama directamente a changePassword sin invocar login previamente
  onChangePassword(): void {
    if (this.passwordForm.invalid || !this.currentUser) {
      alert('Por favor, completa todos los campos.');
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;

    if (newPassword !== confirmPassword) {
      alert('La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    this.authService.changePassword(this.currentUser!.id, currentPassword, newPassword).subscribe({
      next: () => {
        alert('Contraseña cambiada con éxito.');
        this.passwordForm.reset();
      },
      error: (err) => {
        // Contraseña actual incorrecta o error de backend
        alert('La contraseña actual es incorrecta o hubo un error al cambiarla.');
        console.error(err);
        this.passwordForm.controls['currentPassword'].setErrors({ invalid: true });
      }
    });
  }

  // --- NUEVO MÉTODO ---
  deleteAccount(): void {
    if (!this.currentUser) return;

    const confirmation = prompt('Esta acción es permanente. Para confirmar, escribe tu email:');
    if (confirmation === this.currentUser.email) {
      this.authService.deleteAccount(this.currentUser.id).subscribe({
        next: () => {
          alert('Tu cuenta ha sido eliminada.');
          // El servicio se encargará de redirigir al login
        },
        error: () => alert('Hubo un error al eliminar tu cuenta. El endpoint no está implementado en el backend.')
      });
    } else if (confirmation !== null) {
      alert('El email no coincide. La operación ha sido cancelada.');
    }
  }

  // Mapea el rol técnico a una clave legible para traducción
  getReadableRoleKey(role?: string | null): 'ARRENDADOR' | 'ARRENDATARIO' {
    const value = (role || '').toUpperCase();
    if (value.includes('ARRENDADOR')) return 'ARRENDADOR';
    return 'ARRENDATARIO';
  }
}
