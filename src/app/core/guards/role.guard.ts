import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../features/iam/services/auth.service';
import { map, take } from 'rxjs/operators';

/**
 * @summary Role-based guard. Use in routes with data: { roles: [...] }.
 */
export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const allowedRoles = (route.data?.['roles'] as string[]) || [];

  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      if (!user) {
        router.navigate(['/login']);
        return false;
      }
      if (allowedRoles.length === 0 || allowedRoles.includes(user.role)) {
        return true;
      }
      if (user.role === 'ROLE_OWNER') {
        router.navigate(['/my-vehicles']);
      } else {
        router.navigate(['/dashboard']);
      }
      return false;
    })
  );
};
