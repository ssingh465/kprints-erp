import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ApiClientService } from '../../../../core/services/api-client.service';
import { ErpDataService } from '../../../../core/services/erp-data.service';
import { OrderStatus, PrintJob } from '../../../../models/erp.models';
import { KanbanSkeleton } from '../../../../shared/components/kanban-skeleton/kanban-skeleton';
import { StatusChip } from '../../../../shared/components/status-chip/status-chip';
import { TablePanelSkeleton } from '../../../../shared/components/table-panel-skeleton/table-panel-skeleton';

@Component({
  selector: 'app-production-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, DialogModule, SelectModule, TableModule, StatusChip, KanbanSkeleton, TablePanelSkeleton],
  templateUrl: './production-page.html',
  styleUrl: './production-page.scss',
})
export class ProductionPage {
  private readonly api = inject(ApiClientService);
  private readonly data = inject(ErpDataService);

  readonly stages: OrderStatus[] = [
    'Design Approved',
    'Printing Queued',
    'Printing In Progress',
    'Lamination',
    'Framing',
    'Packaging',
    'Ready for Pickup',
    'Ready for Shipping',
  ];

  readonly loading = computed(() => this.data.printJobs.loading());
  readonly jobs = computed(() => this.data.printJobs.entities());
  readonly jobOptions = computed(() =>
    this.jobs().map((job) => ({
      label: `${job.jobNo} — ${job.customerName}`,
      value: job.id,
    })),
  );
  readonly operators = ['Operator A', 'Operator B', 'Operator C'];

  assignDialogOpen = false;
  assignment = {
    jobId: '',
    operator: 'Operator A',
  };

  jobsByStage(stage: OrderStatus) {
    return this.jobs().filter((job) => job.stage === stage);
  }

  openAssignOperator(): void {
    const list = this.jobs();
    if (list.length > 0) {
      this.assignment.jobId = list[0].id;
    }
    this.assignDialogOpen = true;
  }

  saveOperatorAssignment(): void {
    const list = this.jobs();
    const job = list.find((j) => j.id === this.assignment.jobId);
    if (!job) return;

    this.api.put<PrintJob>(`/production/${job.id}/operator`, { operator: this.assignment.operator }).subscribe({
      next: () => {
        this.data.printJobs.refresh();
        this.assignDialogOpen = false;
      },
      error: (err) => console.error('Failed to save operator assignment', err),
    });
  }
}
