import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CheckboxModule } from 'primeng/checkbox';
import { AuthService } from '../../../../core/auth/auth.service';
import { SessionService } from '../../../../core/auth/session.service';
import { mapOAuthRedirectErrorMessage } from '../../../../core/auth/auth-oauth.utils';
import { environment } from '../../../../../environments/environment';
import { AuthLayout } from '../../../../layout/auth-layout/auth-layout';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    CheckboxModule,
    AuthLayout,
  ],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly messages = inject(MessageService);

  readonly submitting = signal(false);
  readonly googleLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly googleOAuthEnabled = environment.googleOAuthEnabled;

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    rememberMe: [false],
  });

  ngOnInit(): void {
    this.applyOAuthRedirectError();
  }

  private applyOAuthRedirectError(): void {
    const errorCode = this.route.snapshot.queryParamMap.get('error_code');
    if (!errorCode) {
      return;
    }

    const description = this.route.snapshot.queryParamMap.get('error_description') ?? '';
    this.errorMessage.set(
      mapOAuthRedirectErrorMessage({
        error: '',
        errorCode,
        description,
      }),
    );

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true,
    });
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    const { email, password, rememberMe } = this.form.getRawValue();

    try {
      const { error } = await this.auth.signInWithPassword(email, password, rememberMe);
      if (error) {
        const mapped = this.mapError(error.message);
        if (mapped === 'EMAIL_NOT_CONFIRMED') {
          await this.router.navigate(['/auth/verify-email']);
          return;
        }
        this.errorMessage.set(mapped);
        if (/invalid email or password/i.test(mapped)) {
          this.messages.add({
            severity: 'error',
            summary: 'Sign-in failed',
            detail: mapped,
            life: 5000,
          });
        }
        return;
      }

      await this.session.refresh();
      await this.session.navigateAfterAuth(this.router);
    } catch {
      this.errorMessage.set('Something went wrong while signing in. Please try again.');
    } finally {
      this.submitting.set(false);
    }
  }

  async signInWithGoogle(): Promise<void> {
    this.googleLoading.set(true);
    this.errorMessage.set(null);
    try {
      const { error } = await this.auth.signInWithGoogle(this.form.getRawValue().rememberMe);
      if (error) {
        this.errorMessage.set(error.message);
        this.googleLoading.set(false);
      }
      // On success the browser redirects to Google; callback resumes the flow.
    } catch {
      this.errorMessage.set('Could not start Google sign-in.');
      this.googleLoading.set(false);
    }
  }

  private mapError(message: string): string {
    if (/invalid login credentials/i.test(message)) {
      return 'Invalid email or password. Please try again.';
    }
    if (/email not confirmed/i.test(message)) {
      return 'EMAIL_NOT_CONFIRMED';
    }
    return message;
  }
}
