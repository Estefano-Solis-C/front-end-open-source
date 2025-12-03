import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

/**
 * @summary NotificationService centralizes user-facing messages via snackbars.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);

  /** @summary Show an error message */
  showError(key: string, durationMs = 4500): void {
    const message = this.translate.instant(key);
    this.snackBar.open(message, 'OK', { duration: durationMs, panelClass: ['snackbar-error'], verticalPosition: 'top' });
  }
}
