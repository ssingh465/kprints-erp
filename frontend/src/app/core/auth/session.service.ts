import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { AuthService } from './auth.service';
import { DemoModeService } from './demo-mode.service';
import { ApiClientService } from '../services/api-client.service';
import { AppUser, AppRole, AuthStatus } from './auth.models';
import { canAccessModule, canWriteModule } from './auth.constants';

export type ProfileIssue = 'no_invitation' | 'profile_missing';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly auth = inject(AuthService);
  private readonly demo = inject(DemoModeService);
  private readonly api = inject(ApiClientService);
  private readonly router = inject(Router);

  readonly status = signal<AuthStatus>(AuthStatus.Initializing);
  readonly user = signal<User | null>(null);
  readonly appUser = signal<AppUser | null>(null);
  /** Set when Supabase auth succeeds but ERP profile cannot be loaded or created. */
  readonly profileIssue = signal<ProfileIssue | null>(null);
  private readonly token = signal<string | null>(null);

  readonly isAuthenticated = computed(() => this.status() === AuthStatus.Authenticated);
  readonly isInitializing = computed(() => this.status() === AuthStatus.Initializing);
  readonly role = computed<AppRole | undefined>(() => this.appUser()?.role);

  isDemoMode(): boolean {
    return this.demo.isDemo();
  }

  accessToken(): string | null {
    return this.token();
  }

  canAccess(module: string): boolean {
    if (this.demo.isDemo()) {
      return module !== 'admin/users';
    }
    return canAccessModule(this.role(), module);
  }

  canWrite(module: string): boolean {
    if (this.demo.isDemo()) {
      return module !== 'admin/users';
    }
    return canWriteModule(this.role(), module);
  }

  /**
   * Restore any persisted Supabase session and load the ERP profile.
   * Wires up auth-state change subscriptions for refresh/sign-out.
   */
  async initialize(): Promise<void> {
    this.auth.onAuthStateChange((event: AuthChangeEvent, session) => {
      if (event === 'TOKEN_REFRESHED' && session) {
        this.token.set(session.access_token);
        return;
      }

      if (event === 'SIGNED_OUT') {
        this.clearSessionState();
        void this.router.navigate(['/auth/session-expired']);
        return;
      }

      void this.applySession(session);
    });

    await this.refresh();
  }

  /** Re-read the current Supabase session and reload the ERP profile. */
  async refresh(): Promise<void> {
    const session = await this.auth.getSession();
    await this.applySession(session);
  }

  private clearSessionState(): void {
    this.token.set(null);
    this.user.set(null);
    this.appUser.set(null);
    this.profileIssue.set(null);
    this.status.set(AuthStatus.Unauthenticated);
  }

  private async applySession(session: Session | null): Promise<void> {
    if (!session) {
      this.clearSessionState();
      return;
    }

    this.token.set(session.access_token);
    this.user.set(session.user);
    await this.loadProfile();
  }

  /** Fetch the ERP profile; creates one on first invited login via sync-profile. */
  async loadProfile(): Promise<void> {
    this.profileIssue.set(null);

    try {
      const profile = await firstValueFrom(this.api.get<AppUser>('/auth/me'));
      this.appUser.set(profile);
      this.status.set(AuthStatus.Authenticated);
      return;
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        this.clearSessionState();
        return;
      }
      // No profile yet (ProfileMissing) or transient error — try sync-profile.
    }

    try {
      const created = await firstValueFrom(
        this.api.post<AppUser>('/auth/sync-profile', {})
      );
      this.appUser.set(created);
      this.status.set(AuthStatus.Authenticated);
      return;
    } catch (err) {
      this.appUser.set(null);
      this.status.set(AuthStatus.Authenticated);

      if (err instanceof HttpErrorResponse) {
        const code = (err.error as { error?: string })?.error;
        if (err.status === 403 && (code === 'NoInvitation' || code === 'Forbidden')) {
          this.profileIssue.set('no_invitation');
          return;
        }
      }

      this.profileIssue.set('profile_missing');
    }
  }

  /** Auth screen for users with a Supabase session but no usable ERP profile. */
  resolveAuthBlockerRoute(): string[] {
    if (!this.isAuthenticated()) {
      return ['/welcome'];
    }

    switch (this.profileIssue()) {
      case 'no_invitation':
        return ['/auth/invite-required'];
      case 'profile_missing':
        return ['/auth/profile-unavailable'];
      default:
        return ['/auth/profile-unavailable'];
    }
  }

  /** Route after Supabase sign-in based on ERP profile state. */
  async navigateAfterAuth(router: Router): Promise<void> {
    const appUser = this.appUser();

    if (!appUser) {
      await router.navigate(this.resolveAuthBlockerRoute());
      return;
    }

    if (!appUser.isActive) {
      await router.navigate(['/auth/account-disabled']);
      return;
    }

    if (!appUser.isApproved) {
      await router.navigate(['/auth/pending-approval']);
      return;
    }

    await router.navigate(['/dashboard']);
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
    this.clearSessionState();
  }
}
