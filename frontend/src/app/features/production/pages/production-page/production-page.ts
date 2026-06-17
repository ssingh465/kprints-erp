import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ApiClientService } from '../../../../core/services/api-client.service';
import { ErpDataService } from '../../../../core/services/erp-data.service';
import { ToastService } from '../../../../core/services/toast.service';
import { OrderStatus, PrintJob } from '../../../../models/erp.models';
import { PRODUCTION_KANBAN_STAGES } from '../../../../shared/erp.constants';
import { KanbanSkeleton } from '../../../../shared/components/kanban-skeleton/kanban-skeleton';
import { StatusChip } from '../../../../shared/components/status-chip/status-chip';
import { TablePanelSkeleton } from '../../../../shared/components/table-panel-skeleton/table-panel-skeleton';

@Component({
  selector: 'app-production-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, SelectModule, TableModule, StatusChip, KanbanSkeleton, TablePanelSkeleton],
  templateUrl: './production-page.html',
  styleUrl: './production-page.scss',
})
export class ProductionPage {
  private readonly api = inject(ApiClientService);
  private readonly data = inject(ErpDataService);
  private readonly toast = inject(ToastService);

  readonly stages: OrderStatus[] = [...PRODUCTION_KANBAN_STAGES];

  readonly loading = computed(() => this.data.printJobs.loading());
  readonly jobs = computed(() => this.data.printJobs.entities());
  readonly jobOptions = computed(() =>
    this.jobs().map((job) => ({
      label: `${job.jobNo} — ${job.customerName}`,
      value: job.id,
    })),
  );
  readonly operatorSuggestions = computed(() => {
    const names = new Set<string>();
    for (const job of this.jobs()) {
      const operator = job.operator?.trim();
      if (operator) {
        names.add(operator);
      }
    }
    return [...names].sort();
  });

  assignDialogOpen = false;
  assignment = {
    jobId: '',
    operator: '',
  };

  jobsByStage(stage: OrderStatus) {
    return this.jobs().filter((job) => job.stage === stage);
  }

  openAssignOperator(): void {
    const list = this.jobs();
    if (list.length > 0) {
      this.assignment.jobId = list[0].id;
      this.assignment.operator = list[0].operator?.trim() ?? '';
    }
    this.assignDialogOpen = true;
  }

  saveOperatorAssignment(): void {
    const list = this.jobs();
    const job = list.find((j) => j.id === this.assignment.jobId);
    if (!job) return;

    this.api.put<PrintJob>(`/production/${job.id}/operator`, { operator: this.assignment.operator }).subscribe({
      next: () => {
        this.toast.success('Operator assigned', `${this.assignment.operator} assigned to ${job.jobNo}.`);
        this.data.printJobs.refresh();
        this.assignDialogOpen = false;
      },
      error: (err) => {
        const detail = err?.error?.message ?? err?.message ?? 'Please try again.';
        this.toast.error('Operator assignment failed', detail);
      },
    });
  }
}
