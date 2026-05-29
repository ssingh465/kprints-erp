import { Injectable, inject, signal } from '@angular/core';
import { OperationalSignals } from '../../models/erp.models';
import { ApiClientService } from './api-client.service';

@Injectable({ providedIn: 'root' })
export class OperationalSignalsService {
  private readonly api = inject(ApiClientService);

  readonly notifications = signal<string[]>([]);
  readonly activityTimeline = signal<OperationalSignals['activityTimeline']>([]);
  readonly loading = signal(true);

  refresh(): void {
    this.loading.set(true);
    this.api.get<OperationalSignals>('/dashboard/signals').subscribe({
      next: (data) => {
        this.notifications.set(data.notifications ?? []);
        this.activityTimeline.set(data.activityTimeline ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.notifications.set([]);
        this.activityTimeline.set([]);
        this.loading.set(false);
      },
    });
  }
}
