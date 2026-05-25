import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, signal } from '@angular/core';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly darkMode = signal(false);

  constructor(
    @Inject(DOCUMENT) private readonly document: Document,
    private readonly storage: StorageService,
  ) {
    this.setDarkMode(this.storage.get('theme.dark', false));
  }

  toggle(): void {
    this.setDarkMode(!this.darkMode());
  }

  setDarkMode(enabled: boolean): void {
    this.darkMode.set(enabled);
    this.document.documentElement.classList.toggle('app-dark', enabled);
    this.storage.set('theme.dark', enabled);
  }
}
