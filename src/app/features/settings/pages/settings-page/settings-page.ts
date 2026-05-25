import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { MockSeedService } from '../../../../core/services/mock-seed.service';
import { ThemeService } from '../../../../core/services/theme.service';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.scss',
})
export class SettingsPage {
  constructor(
    readonly theme: ThemeService,
    private readonly seed: MockSeedService,
  ) {}

  resetData(): void {
    this.seed.reset();
    window.location.reload();
  }
}
