import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { AuthService } from '../../../../core/auth/auth.service';
import { AuthLayout } from '../../../../layout/auth-layout/auth-layout';

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonModule, PasswordModule, AuthLayout],
  templateUrl: './reset-password-page.html',
  styleUrl: './reset-password-page.scss',
})
export class ResetPasswordPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly success = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly sessionReady = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
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
    const session = await this.auth.getSession();
    if (!session) {
      this.errorMessage.set(
        'This reset link is invalid or has expired. Request a new one from the sign-in page.'
      );
      return;
    }
    this.sessionReady.set(true);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    try {
      const { error } = await this.auth.updatePassword(this.form.getRawValue().password);
      if (error) {
        this.errorMessage.set(error.message);
        return;
      }
      this.success.set(true);
      setTimeout(() => void this.router.navigate(['/auth/login']), 2000);
    } catch {
      this.errorMessage.set('Could not update your password. Please try again.');
    } finally {
      this.submitting.set(false);
    }
  }
}
