import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
// Importaciones para Formularios Reactivos
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { UserDto } from '../../models/user.dto';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule], // <-- Añadir ReactiveFormsModule
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  registerForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['ROLE_ARRENDATARIO', Validators.required] // Rol por defecto actualizado
    });
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      return; // Si el formulario no es válido, no hacer nada
    }

    const userData: UserDto = this.registerForm.value;

    this.authService.register(userData).subscribe({
      next: () => {
        alert('¡Cuenta creada con éxito! Ahora puedes iniciar sesión.');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Error en el registro:', err);
        alert('Hubo un error al crear la cuenta. Inténtalo de nuevo.');
      }
    });
  }
}
