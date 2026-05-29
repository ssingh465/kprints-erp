import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { AuthLayout } from '../../../../layout/auth-layout/auth-layout';
import { UsersService } from '../../../admin/users/services/users.service';
import { ROLE_LABELS } from '../../../../core/auth/auth.models';

type InviteState = 'loading' | 'valid' | 'expired' | 'invalid';

@Component({
  selector: 'app-invite-page',
  standalone: true,
  imports: [RouterLink, ButtonModule, TagModule, AuthLayout],
  templateUrl: './invite-page.html',
  styleUrl: './invite-page.scss',
})
export class InvitePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly usersService = inject(UsersService);

  readonly state = signal<InviteState>('loading');
  readonly email = signal<string | null>(null);
  readonly roleLabel = signal<string | null>(null);
  readonly message = signal<string | null>(null);

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';

    if (!token) {
      this.state.set('invalid');
      this.message.set('This invitation link is no longer valid.');
      return;
    }

    this.usersService.validateInvite(token).subscribe({
      next: (result) => {
        if (result.valid) {
          this.state.set('valid');
          this.email.set(result.email ?? null);
          this.roleLabel.set(result.role ? ROLE_LABELS[result.role] : null);
        } else if (result.expired) {
          this.state.set('expired');
          this.message.set(
            result.message ??
              'This invitation has expired. Contact your administrator for a new invite.'
          );
        } else {
          this.state.set('invalid');
          this.message.set(result.message ?? 'This invitation link is no longer valid.');
        }
      },
      error: () => {
        this.state.set('invalid');
        this.message.set('Could not validate this invitation. Please try again later.');
      },
    });
  }

  goToLogin(): void {
    void this.router.navigate(['/auth/login']);
  }
}
