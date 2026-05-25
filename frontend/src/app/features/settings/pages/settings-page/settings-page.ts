import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MockSeedService } from '../../../../core/services/mock-seed.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { ApiClientService } from '../../../../core/services/api-client.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, ButtonModule, DialogModule],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.scss',
})
export class SettingsPage implements OnInit {
  readonly isApiMode = environment.storageMode === 'api';
  isDemoMode = false;
  showResetDialog = false;
  resetting = false;
  resetError: string | null = null;

  constructor(
    readonly theme: ThemeService,
    private readonly seed: MockSeedService,
    private readonly apiClient: ApiClientService,
  ) {}

  ngOnInit(): void {
    if (this.isApiMode) {
      this.checkDemoModeStatus();
    }
  }

  private checkDemoModeStatus(): void {
    this.apiClient.get<{ setupCompleted: boolean; demoMode: boolean }>('/setup/status').subscribe({
      next: (status) => {
        this.isDemoMode = status.demoMode;
      },
      error: (err) => {
        console.error('Failed to fetch setup status', err);
      },
    });
  }

  resetData(): void {
    this.seed.reset();
    window.location.reload();
  }

  confirmReset(): void {
    this.showResetDialog = true;
    this.resetError = null;
  }

  executeReset(): void {
    this.resetting = true;
    this.resetError = null;
    this.apiClient.post('/setup/fresh', {}).subscribe({
      next: () => {
        this.resetting = false;
        this.showResetDialog = false;
        window.location.reload();
      },
      error: (err) => {
        this.resetting = false;
        this.resetError = err.message || 'Failed to reset database to a fresh state.';
      },
    });
  }
}

