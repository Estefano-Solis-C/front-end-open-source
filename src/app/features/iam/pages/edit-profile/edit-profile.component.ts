import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { take } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

/**
 * EditProfile component allows editing user basic info and password.
 * Simplified variant of Profile component without logout flow.
 */
@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslateModule],
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
    private router: Router,
    private translate: TranslateService
  ) {
    this.infoForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    });
  }

  /** Initialize form values with current user */
  ngOnInit(): void {
    this.authService.currentUser$.pipe(take(1)).subscribe(user => {
      if (user) {
        this.currentUser = user;
        this.infoForm.patchValue({
          name: user.name,
          email: user.email
        });
      }
    });
  }

  /** Persist updated user information */
  onUpdateInformation(): void {
    if (this.infoForm.invalid || !this.currentUser) {
      alert(this.translate.instant('PROFILE.VALIDATION_REQUIRED'));
      return;
    }

    const updatedUser: User = {
      ...this.currentUser,
      name: this.infoForm.value.name,
      email: this.infoForm.value.email
    };

    this.authService.updateUser(updatedUser).subscribe({
      next: () => {
        alert(this.translate.instant('PROFILE.UPDATE_INFO_SUCCESS'));
        this.router.navigate(['/profile']);
      },
      error: (err) => {
        console.error('Error al actualizar la información:', err);
        alert(this.translate.instant('PROFILE.UPDATE_INFO_ERROR'));
      }
    });
  }

  /** Simulate password change (demo with json-server) */
  onChangePassword(): void {
    if (this.passwordForm.invalid) {
      alert(this.translate.instant('PROFILE.VALIDATION_REQUIRED'));
      return;
    }

    const { newPassword, confirmPassword } = this.passwordForm.value;

    if (newPassword !== confirmPassword) {
      alert(this.translate.instant('PROFILE.PASSWORD_MISMATCH'));
      return;
    }

    console.log('Cambiando contraseña...');
    alert(this.translate.instant('PROFILE.UPDATE_PASSWORD_SUCCESS'));
    this.passwordForm.reset();
  }
}
