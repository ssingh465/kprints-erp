import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AuthService } from '../../../../core/auth/auth.service';
import { SessionService } from '../../../../core/auth/session.service';
import { AuthLayout } from '../../../../layout/auth-layout/auth-layout';

@Component({
  selector: 'app-verify-email-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, AuthLayout],
  templateUrl: './verify-email-page.html',
  styleUrl: './verify-email-page.scss',
})
export class VerifyEmailPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly session = inject(SessionService);

  readonly submitting = signal(false);
  readonly sent = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    const email = this.session.appUser()?.email;
    if (email) {
      this.form.patchValue({ email });
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    try {
      const { error } = await this.auth.resendVerificationEmail(this.form.getRawValue().email);
      if (error) {
        this.errorMessage.set(error.message);
        return;
      }
      this.sent.set(true);
    } catch {
      this.errorMessage.set('Could not resend the verification email. Please try again.');
    } finally {
      this.submitting.set(false);
    }
  }
}
