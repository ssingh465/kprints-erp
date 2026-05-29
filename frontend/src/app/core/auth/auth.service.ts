import { Injectable, inject } from '@angular/core';
import {
  createClient,
  type AuthChangeEvent,
  type Session,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { AuthStorageService } from './auth-storage.service';

/**
 * Thin wrapper over the Supabase JS client for identity operations.
 * Session persistence is delegated to {@link AuthStorageService} so the
 * Remember-me choice controls localStorage vs sessionStorage.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authStorage = inject(AuthStorageService);

  readonly client: SupabaseClient = createClient(
    environment.supabaseUrl || 'https://placeholder.supabase.co',
    environment.supabaseAnonKey || 'placeholder-key',
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: {
          getItem: (key) => this.authStorage.getItem(key),
          setItem: (key, value) => this.authStorage.setItem(key, value),
          removeItem: (key) => this.authStorage.removeItem(key),
        },
      },
    }
  );

  async signInWithPassword(email: string, password: string, rememberMe: boolean) {
    this.authStorage.setRememberMe(rememberMe);
    return this.client.auth.signInWithPassword({ email, password });
  }

  async signInWithGoogle(rememberMe: boolean) {
    this.authStorage.setRememberMe(rememberMe);
    const redirectTo = `${window.location.origin}${environment.authRedirectUrl}`;
    return this.client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
  }

  async resetPasswordForEmail(email: string) {
    const redirectTo = `${window.location.origin}/auth/reset-password`;
    return this.client.auth.resetPasswordForEmail(email, { redirectTo });
  }

  async updatePassword(password: string) {
    return this.client.auth.updateUser({ password });
  }

  /**
   * Set password and display name after accepting a Supabase invite.
   * Writes to auth user_metadata (full_name, name, display_name).
   */
  async completeInviteSignup(password: string, fullName: string) {
    return this.client.auth.updateUser({
      password,
      data: {
        full_name: fullName,
        name: fullName,
        display_name: fullName,
      },
    });
  }

  async resendVerificationEmail(email: string) {
    return this.client.auth.resend({ type: 'signup', email });
  }

  async signOut() {
    return this.client.auth.signOut();
  }

  async getSession(): Promise<Session | null> {
    const { data } = await this.client.auth.getSession();
    return data.session ?? null;
  }

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return this.client.auth.onAuthStateChange(callback);
  }
}
