import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../features/iam/services/auth.service';
import { map, take } from 'rxjs/operators';

/**
 * @summary Redirects the empty child route to the appropriate section based on user role.
 */
export const defaultRedirectGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      if (!user) {
        router.navigate(['/login']);
        return false;
      }
      if (user.role === 'ROLE_RENTER') {
        router.navigate(['/dashboard']);
      } else {
        router.navigate(['/my-vehicles']);
      }
      return false;
    })
  );
};
