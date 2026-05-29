import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../auth/session.service';
import { DemoModeService } from '../auth/demo-mode.service';

/**
 * Keeps authenticated users off guest-only auth screens (login, welcome).
 */
export const guestGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const demo = inject(DemoModeService);
  const router = inject(Router);

  if (demo.isDemo() || !session.isAuthenticated() || !session.appUser()) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
