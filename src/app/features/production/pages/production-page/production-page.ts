import { CommonModule } from '@angular/common';
import { Component, computed } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { MockSeedService } from '../../../../core/services/mock-seed.service';
import { OrderStatus } from '../../../../models/erp.models';
import { StatusChip } from '../../../../shared/components/status-chip/status-chip';

@Component({
  selector: 'app-production-page',
  standalone: true,
  imports: [CommonModule, ButtonModule, TableModule, StatusChip],
  templateUrl: './production-page.html',
  styleUrl: './production-page.scss',
})
export class ProductionPage {
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

  readonly jobs = computed(() => this.seed.printJobs.entities());

  constructor(private readonly seed: MockSeedService) {}

  jobsByStage(stage: OrderStatus) {
    return this.jobs().filter((job) => job.stage === stage);
  }
}
