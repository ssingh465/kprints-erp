import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../auth/session.service';
import { DemoModeService } from '../auth/demo-mode.service';

/**
 * Redirects pending-approval or disabled accounts away from the AppShell.
 */
export const approvalGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const demo = inject(DemoModeService);
  const router = inject(Router);

  if (demo.isDemo()) {
    return true;
  }

  const user = session.appUser();
  if (!user) {
    if (!session.isAuthenticated()) {
      return router.createUrlTree(['/welcome']);
    }
    return router.createUrlTree(session.resolveAuthBlockerRoute());
  }

  if (!user.isActive) {
    return router.createUrlTree(['/auth/account-disabled']);
  }

  if (!user.isApproved) {
    return router.createUrlTree(['/auth/pending-approval']);
  }

  return true;
};
