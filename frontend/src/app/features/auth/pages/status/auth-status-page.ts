import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthLayout } from '../../../../layout/auth-layout/auth-layout';
import { SessionService } from '../../../../core/auth/session.service';

export interface AuthStatusConfig {
  icon: string;
  iconTone: 'warning' | 'danger' | 'info';
  title: string;
  message: string;
  messageLink?: {
    text: string;
    route: string;
  };
  showSignOut?: boolean;
}

/**
 * Generic informational auth screen (pending approval, account disabled, etc.).
 * Content is supplied via route `data.status`.
 */
@Component({
  selector: 'app-auth-status-page',
  standalone: true,
  imports: [ButtonModule, RouterLink, AuthLayout],
  templateUrl: './auth-status-page.html',
  styleUrl: './auth-status-page.scss',
})
export class AuthStatusPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);

  readonly signingOut = signal(false);
  readonly config: AuthStatusConfig = this.route.snapshot.data['status'] ?? {
    icon: 'pi pi-info-circle',
    iconTone: 'info',
    title: 'Notice',
    message: 'Something needs your attention.',
  };

  readonly messageParts = this.buildMessageParts();

  private buildMessageParts(): {
    before: string;
    linkText: string;
    after: string;
    route: string;
  } | null {
    const link = this.config.messageLink;
    if (!link) {
      return null;
    }

    const index = this.config.message.indexOf(link.text);
    if (index === -1) {
      return null;
    }

    return {
      before: this.config.message.slice(0, index),
      linkText: link.text,
      after: this.config.message.slice(index + link.text.length),
      route: link.route,
    };
  }

  async signOut(): Promise<void> {
    this.signingOut.set(true);
    await this.session.signOut();
    await this.router.navigate(['/welcome']);
  }
}
