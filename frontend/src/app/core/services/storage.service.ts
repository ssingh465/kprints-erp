import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly prefix = 'kprints-erp';

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

  private key(key: string): string {
    return `${this.prefix}:${key}`;
  }
}
