import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ApiClientService } from '../../../../core/services/api-client.service';
import { ErpDataService } from '../../../../core/services/erp-data.service';
import { OrderStatus, PrintJob } from '../../../../models/erp.models';
import { StatusChip } from '../../../../shared/components/status-chip/status-chip';
import { TablePanelSkeleton } from '../../../../shared/components/table-panel-skeleton/table-panel-skeleton';

@Component({
  selector: 'app-print-queue-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, SelectModule, TableModule, StatusChip, TablePanelSkeleton],
  templateUrl: './print-queue-page.html',
  styleUrl: './print-queue-page.scss',
})
export class PrintQueuePage {
  private readonly data = inject(ErpDataService);
  private readonly api = inject(ApiClientService);

  readonly search = signal('');
  readonly loading = computed(() => this.data.printJobs.loading());
  readonly stageFilter = signal<OrderStatus | 'All'>('All');
  readonly jobs = computed(() => this.data.printJobs.entities());
  readonly filtered = computed(() => {
    const query = this.search().toLowerCase();
    const stage = this.stageFilter();
    return this.jobs().filter((job) => {
      const matchesQuery =
        !query ||
        job.jobNo.toLowerCase().includes(query) ||
        job.orderNo.toLowerCase().includes(query) ||
        job.customerName.toLowerCase().includes(query);
      const matchesStage = stage === 'All' || job.stage === stage;
      return matchesQuery && matchesStage;
    });
  });

  readonly stages: Array<OrderStatus | 'All'> = [
    'All',
    'Printing Queued',
    'Printing In Progress',
    'Lamination',
    'Framing',
    'Packaging',
    'Ready for Pickup',
    'Ready for Shipping',
  ];
  readonly stageOptions = this.stages.filter((stage) => stage !== 'All') as OrderStatus[];
  readonly operators = ['Operator A', 'Operator B', 'Operator C', 'Operator D'];

  stageDialogOpen = false;
  operatorDialogOpen = false;
  selectedJob: PrintJob | null = null;
  newStage: OrderStatus = 'Printing In Progress';
  operator = 'Operator A';

  openStageUpdate(job: PrintJob): void {
    this.selectedJob = job;
    this.newStage = job.stage;
    this.stageDialogOpen = true;
  }

  openOperatorAssign(job: PrintJob): void {
    this.selectedJob = job;
    this.operator = job.operator || 'Operator A';
    this.operatorDialogOpen = true;
  }

  saveStage(): void {
    if (!this.selectedJob) return;
    this.api.put<PrintJob>(`/production/${this.selectedJob.id}/stage`, { stage: this.newStage }).subscribe({
      next: () => {
        this.data.printJobs.refresh();
        this.stageDialogOpen = false;
      },
    });
  }

  saveOperator(): void {
    if (!this.selectedJob) return;
    this.api.put<PrintJob>(`/production/${this.selectedJob.id}/operator`, { operator: this.operator }).subscribe({
      next: () => {
        this.data.printJobs.refresh();
        this.operatorDialogOpen = false;
      },
    });
  }
}
