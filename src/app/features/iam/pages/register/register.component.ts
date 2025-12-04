import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { UserDto } from '../../models/user.dto';
import { TranslateService } from '@ngx-translate/core';

/**
 * Register component handles new account creation.
 * Uses reactive form with basic validations.
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  registerForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private translate: TranslateService
  ) {
    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['ROLE_ARRENDATARIO', Validators.required]
    });
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      return;
    }

    const userData: UserDto = this.registerForm.value;

    this.authService.register(userData).subscribe({
      next: () => {
        alert(this.translate.instant('LOGIN.REGISTER_SUCCESS'));
        this.router.navigate(['/login']);
      },
      error: (err) => {
        alert(this.translate.instant('LOGIN.REGISTER_ERROR'));
      }
    });
  }
}
