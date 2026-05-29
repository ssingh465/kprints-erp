import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { ApiClientService } from '../../../../core/services/api-client.service';
import { SettingsCardSkeleton } from '../../../../shared/components/settings-card-skeleton/settings-card-skeleton';

type SetupStatus = {
  setupCompleted: boolean;
  demoMode: boolean;
};

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, ButtonModule, DialogModule, TagModule, SettingsCardSkeleton],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.scss',
})
export class SettingsPage implements OnInit {
  readonly setupStatus = signal<SetupStatus | null>(null);
  readonly statusLoading = signal(true);
  readonly statusError = signal<string | null>(null);

  showDemoDialog = false;
  showFreshDialog = false;
  loadingDemo = false;
  loadingFresh = false;
  actionError: string | null = null;

  constructor(private readonly apiClient: ApiClientService) {}

  ngOnInit(): void {
    this.refreshSetupStatus();
  }

  refreshSetupStatus(): void {
    this.statusLoading.set(true);
    this.statusError.set(null);
    this.apiClient.get<SetupStatus>('/setup/status').subscribe({
      next: (status) => {
        this.setupStatus.set(status);
        this.statusLoading.set(false);
      },
      error: (err) => {
        this.statusLoading.set(false);
        this.statusError.set(err.message || 'Could not reach the backend. Is it running?');
      },
    });
  }

  openLoadDemoDialog(): void {
    this.showDemoDialog = true;
    this.actionError = null;
  }

  openStartFreshDialog(): void {
    this.showFreshDialog = true;
    this.actionError = null;
  }

  loadDemoData(): void {
    this.loadingDemo = true;
    this.actionError = null;
    this.apiClient.post('/setup/demo', {}).subscribe({
      next: () => {
        this.loadingDemo = false;
        this.showDemoDialog = false;
        window.location.reload();
      },
      error: (err) => {
        this.loadingDemo = false;
        this.actionError = err.message || 'Failed to load demo data.';
      },
    });
  }

  startFresh(): void {
    this.loadingFresh = true;
    this.actionError = null;
    this.apiClient.post('/setup/fresh', {}).subscribe({
      next: () => {
        this.loadingFresh = false;
        this.showFreshDialog = false;
        window.location.reload();
      },
      error: (err) => {
        this.loadingFresh = false;
        this.actionError = err.message || 'Failed to reset database to a fresh state.';
      },
    });
  }
}
