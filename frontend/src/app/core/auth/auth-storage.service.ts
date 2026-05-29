import { Injectable } from '@angular/core';
import { AUTH_STORAGE_KEYS } from './auth.constants';

/**
 * Supabase-compatible storage adapter that routes the persisted session to
 * either `localStorage` (Remember me) or `sessionStorage` (default).
 *
 * The choice is driven by a small flag in localStorage so it survives reloads,
 * and reads fall back across both stores so an in-flight session is never lost.
 */
@Injectable({ providedIn: 'root' })
export class AuthStorageService {
  private readonly prefix = 'kprints-erp';

  private flagKey(): string {
    return `${this.prefix}:${AUTH_STORAGE_KEYS.rememberMe}`;
  }

  /** Persist the Remember-me preference (call before sign-in). */
  setRememberMe(remember: boolean): void {
    try {
      localStorage.setItem(this.flagKey(), remember ? 'true' : 'false');
    } catch {
      /* storage unavailable */
    }
  }

  getRememberMe(): boolean {
    try {
      return localStorage.getItem(this.flagKey()) === 'true';
    } catch {
      return false;
    }
  }

  private target(): Storage {
    return this.getRememberMe() ? localStorage : sessionStorage;
  }

  getItem(key: string): string | null {
    try {
      return sessionStorage.getItem(key) ?? localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      const store = this.target();
      const other = store === localStorage ? sessionStorage : localStorage;
      other.removeItem(key);
      store.setItem(key, value);
    } catch {
      /* storage unavailable */
    }
  }

  removeItem(key: string): void {
    try {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    } catch {
      /* storage unavailable */
    }
  }
}
