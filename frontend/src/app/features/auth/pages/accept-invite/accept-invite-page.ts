import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { TagModule } from 'primeng/tag';
import { AuthService } from '../../../../core/auth/auth.service';
import { SessionService } from '../../../../core/auth/session.service';
import { AuthLayout } from '../../../../layout/auth-layout/auth-layout';
import { AppRole, ROLE_LABELS } from '../../../../core/auth/auth.models';
import { readOAuthRedirectError } from '../../../../core/auth/auth-oauth.utils';
import { formatProperName, properNameValidator } from '../../../../core/auth/auth-name.utils';

type AcceptInviteState = 'loading' | 'setup' | 'error';

/**
 * Completes Supabase invite signup: the invite email link lands here with a
 * short-lived session in the URL hash; the user sets name + password, then we
 * sync the ERP profile and send them to pending approval.
 */
@Component({
  selector: 'app-accept-invite-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    TagModule,
    AuthLayout,
  ],
  templateUrl: './accept-invite-page.html',
  styleUrl: './accept-invite-page.scss',
})
export class AcceptInvitePage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  readonly state = signal<AcceptInviteState>('loading');
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly email = signal<string | null>(null);
  readonly roleLabel = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      fullName: ['', [Validators.required, Validators.minLength(2), properNameValidator()]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: (group) =>
        group.get('password')?.value === group.get('confirmPassword')?.value
          ? null
          : { mismatch: true },
    }
  );

  async ngOnInit(): Promise<void> {
    const oauthError = readOAuthRedirectError();
    if (oauthError) {
      this.state.set('error');
      this.errorMessage.set(
        oauthError.description || 'This invitation link is invalid or has expired.'
      );
      return;
    }

    let session = await this.auth.getSession();
    let attempts = 0;
    while (!session && attempts < 15) {
      await new Promise((r) => setTimeout(r, 150));
      session = await this.auth.getSession();
      attempts++;
    }

    if (!session) {
      this.state.set('error');
      this.errorMessage.set(
        'This invitation link is invalid or has expired. Ask your administrator to resend the invite.'
      );
      return;
    }

    this.email.set(session.user.email ?? null);

    const metadata = (session.user.user_metadata ?? {}) as Record<string, unknown>;
    const role = metadata['role'] as AppRole | undefined;
    if (role && role in ROLE_LABELS) {
      this.roleLabel.set(ROLE_LABELS[role]);
    }

    this.state.set('setup');
  }

  onFullNameBlur(): void {
    const control = this.form.controls.fullName;
    const formatted = formatProperName(control.value);
    if (formatted && formatted !== control.value) {
      control.setValue(formatted);
    }
    control.markAsTouched();
    control.updateValueAndValidity();
  }

  async submit(): Promise<void> {
    this.form.controls.fullName.setValue(formatProperName(this.form.controls.fullName.value));

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const { fullName, password } = this.form.getRawValue();

    try {
      const { error } = await this.auth.completeInviteSignup(password, fullName);
      if (error) {
        this.errorMessage.set(error.message);
        return;
      }

      await this.session.refresh();

      const appUser = this.session.appUser();
      if (!appUser) {
        this.state.set('error');
        this.errorMessage.set(
          'Your password was set, but we could not finish account setup. ' +
            'Contact your administrator — your invitation may have expired.'
        );
        return;
      }

      await this.session.navigateAfterAuth(this.router);
    } catch {
      this.errorMessage.set('Could not complete signup. Please try again.');
    } finally {
      this.submitting.set(false);
    }
  }
}
