import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';
import { SessionService } from '../auth/session.service';
import { DemoModeService } from '../auth/demo-mode.service';

/**
 * Attaches either a Bearer token (authenticated) or the demo-mode header.
 * Maps standard auth error codes to the appropriate auth screens with toasts.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionService);
  const demo = inject(DemoModeService);
  const router = inject(Router);
  const messages = inject(MessageService);

  let outgoing = req;
  if (session.isDemoMode()) {
    outgoing = req.clone({ setHeaders: { 'X-App-Mode': 'demo' } });
  } else {
    const token = session.accessToken();
    if (token) {
      outgoing = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    }
  }

  const isAuthEndpoint = req.url.includes('/auth/');

  return next(outgoing).pipe(
    catchError((err: HttpErrorResponse) => {
      if (!isAuthEndpoint && err.error && typeof err.error === 'object') {
        const code = (err.error as { error?: string }).error;

        if (err.status === 401 && code === 'Unauthorized') {
          if (session.isDemoMode()) {
            demo.exitDemo();
            messages.add({
              severity: 'warn',
              summary: 'Demo unavailable',
              detail: 'The demo sandbox could not be reached. Try again from the welcome screen.',
              life: 6000,
            });
            void router.navigate(['/welcome']);
          } else {
            messages.add({
              severity: 'warn',
              summary: 'Session expired',
              detail: 'Your session has expired. Please sign in again.',
              life: 6000,
            });
            void router.navigate(['/auth/session-expired']);
          }
        } else if (err.status === 403) {
          switch (code) {
            case 'PendingApproval':
              messages.add({
                severity: 'info',
                summary: 'Pending approval',
                detail: 'Your account is waiting for administrator approval.',
                life: 6000,
              });
              void router.navigate(['/auth/pending-approval']);
              break;
            case 'AccountDisabled':
              messages.add({
                severity: 'error',
                summary: 'Account disabled',
                detail: 'Your account has been deactivated. Contact your administrator.',
                life: 6000,
              });
              void router.navigate(['/auth/account-disabled']);
              break;
            case 'Forbidden':
              messages.add({
                severity: 'error',
                summary: 'Access denied',
                detail: 'You do not have permission to perform this action.',
                life: 6000,
              });
              void router.navigate(['/auth/unauthorized']);
              break;
          }
        }
      }

      return throwError(() => err);
    })
  );
};
