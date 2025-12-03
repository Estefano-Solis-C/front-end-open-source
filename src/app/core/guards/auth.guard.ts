import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../features/iam/services/auth.service';
import { map, take } from 'rxjs/operators';

/**
 * @summary Protects routes from anonymous access, redirecting unauthenticated users to login.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      if (user) return true;
      router.navigate(['/login']);
      return false;
    })
  );
};
