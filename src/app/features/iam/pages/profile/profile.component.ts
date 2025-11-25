import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Observable, take } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

/**
 * Profile component allows viewing and updating user info,
 * changing password and deleting the account.
 */
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

  /** Form for basic user information */
  infoForm: FormGroup;
  /** Form for password change */
  passwordForm: FormGroup;
  isEditMode = false;

  constructor(
    private authService: AuthService,
    private fb: FormBuilder,
    private translate: TranslateService
  ) {
    this.currentUser$ = this.authService.currentUser$;

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
        alert(this.translate.instant('PROFILE.UPDATE_INFO_SUCCESS'));
        this.authService.logout();
      },
      error: () => alert(this.translate.instant('PROFILE.UPDATE_INFO_ERROR'))
    });
  }

  onChangePassword(): void {
    if (this.passwordForm.invalid || !this.currentUser) {
      alert(this.translate.instant('PROFILE.VALIDATION_REQUIRED'));
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;

    if (newPassword !== confirmPassword) {
      alert(this.translate.instant('PROFILE.PASSWORD_MISMATCH'));
      return;
    }

    this.authService.changePassword(this.currentUser!.id, currentPassword, newPassword).subscribe({
      next: () => {
        alert(this.translate.instant('PROFILE.UPDATE_PASSWORD_SUCCESS'));
        this.passwordForm.reset();
        this.authService.logout();
      },
      error: (err) => {
        alert(this.translate.instant('PROFILE.UPDATE_PASSWORD_ERROR'));
        console.error(err);
        this.passwordForm.controls['currentPassword'].setErrors({ invalid: true });
      }
    });
  }

  deleteAccount(): void {
    if (!this.currentUser) return;

    const confirmation = prompt(this.translate.instant('PROFILE.DELETE_ACCOUNT_CONFIRM'));
    if (confirmation === this.currentUser.email) {
      this.authService.deleteAccount(this.currentUser.id).subscribe({
        next: () => {
          alert(this.translate.instant('PROFILE.DELETE_ACCOUNT_SUCCESS'));
        },
        error: () => alert(this.translate.instant('PROFILE.DELETE_ACCOUNT_ERROR'))
      });
    } else if (confirmation !== null) {
      alert(this.translate.instant('PROFILE.DELETE_ACCOUNT_EMAIL_MISMATCH'));
    }
  }

  getReadableRoleKey(role?: string | null): 'ARRENDADOR' | 'ARRENDATARIO' {
    const value = (role || '').toUpperCase();
    if (value.includes('ARRENDADOR')) return 'ARRENDADOR';
    return 'ARRENDATARIO';
  }
}
