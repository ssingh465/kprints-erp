import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { SessionService } from '../auth/session.service';

/**
 * Enforces module-level read access from route `data.module`.
 */
export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const session = inject(SessionService);
  const router = inject(Router);

  const module = route.data['module'] as string | undefined;
  if (!module) {
    return true;
  }

  if (session.canAccess(module)) {
    return true;
  }

  return router.createUrlTree(['/auth/unauthorized'], {
    queryParams: { module },
  });
};
