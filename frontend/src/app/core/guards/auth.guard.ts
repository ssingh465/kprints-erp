import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../auth/session.service';
import { DemoModeService } from '../auth/demo-mode.service';

/**
 * Phase 2 gate for the AppShell: allow demo sandbox or an authenticated session.
 * Approval and module access are enforced by approvalGuard + roleGuard on child routes.
 */
export const authGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const demo = inject(DemoModeService);
  const router = inject(Router);

  if (demo.isDemo()) {
    return true;
  }

  if (session.isAuthenticated() && session.appUser()) {
    return true;
  }

  if (session.isAuthenticated()) {
    return router.createUrlTree(session.resolveAuthBlockerRoute());
  }

  return router.createUrlTree(['/welcome']);
};
