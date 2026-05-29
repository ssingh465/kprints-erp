import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SessionService } from '../../../../core/auth/session.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { readOAuthRedirectError, readAuthCallbackType, isInviteCallbackType } from '../../../../core/auth/auth-oauth.utils';

/**
 * Handles the OAuth / email-link redirect. Supabase parses the session from the
 * URL (detectSessionInUrl), then we resolve the ERP profile and route onward.
 */
@Component({
  selector: 'app-callback-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './callback-page.html',
  styleUrl: './callback-page.scss',
})
export class CallbackPage implements OnInit {
  private readonly session = inject(SessionService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const oauthError = readOAuthRedirectError();
    if (oauthError) {
      await this.router.navigate(['/auth/login'], {
        queryParams: {
          error_code: oauthError.errorCode || oauthError.error,
          ...(oauthError.description ? { error_description: oauthError.description } : {}),
        },
        replaceUrl: true,
      });
      return;
    }

    // Legacy invite emails that still redirect to /auth/callback
    const authType = readAuthCallbackType();
    if (isInviteCallbackType(authType)) {
      const suffix = `${window.location.search}${window.location.hash}`;
      window.location.replace(`/auth/accept-invite${suffix}`);
      return;
    }

    try {
      // Give Supabase a tick to process the URL hash, then verify.
      let attempts = 0;
      let current = await this.auth.getSession();
      while (!current && attempts < 10) {
        await new Promise((r) => setTimeout(r, 150));
        current = await this.auth.getSession();
        attempts++;
      }

      if (!current) {
        await this.router.navigate(['/auth/login'], {
          queryParams: { error_code: 'session_missing' },
          replaceUrl: true,
        });
        return;
      }

      await this.session.refresh();
      await this.session.navigateAfterAuth(this.router);
    } catch {
      this.error.set('We could not complete sign-in. Please try again.');
    }
  }
}
