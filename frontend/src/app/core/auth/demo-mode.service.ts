import { Injectable, inject, signal } from '@angular/core';
import { StorageService } from '../services/storage.service';
import { AUTH_STORAGE_KEYS, APP_MODE_DEMO } from './auth.constants';

/**
 * Tracks whether the app is running in the unauthenticated demo sandbox.
 * Demo mode is an auth bypass against shared seed data — not a separate DB.
 */
@Injectable({ providedIn: 'root' })
export class DemoModeService {
  private readonly storage = inject(StorageService);

  readonly isDemo = signal<boolean>(
    this.storage.get<string>(AUTH_STORAGE_KEYS.appMode, '') === APP_MODE_DEMO
  );

  enterDemo(): void {
    this.storage.set(AUTH_STORAGE_KEYS.appMode, APP_MODE_DEMO);
    this.isDemo.set(true);
  }

  exitDemo(): void {
    this.storage.set(AUTH_STORAGE_KEYS.appMode, '');
    this.isDemo.set(false);
  }
}
