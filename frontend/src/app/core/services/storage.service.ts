import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly prefix = 'kprints-erp';
  readonly version = signal('1.0.0');

  get<T>(key: string, fallback: T): T {
    const raw = localStorage.getItem(this.key(key));

    if (!raw) {
      return fallback;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  set<T>(key: string, value: T): void {
    localStorage.setItem(this.key(key), JSON.stringify(value));
  }

  remove(key: string): void {
    localStorage.removeItem(this.key(key));
  }

  clearAppData(): void {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(`${this.prefix}:`))
      .forEach((key) => localStorage.removeItem(key));
  }

  private key(key: string): string {
    return `${this.prefix}:${key}`;
  }
}
