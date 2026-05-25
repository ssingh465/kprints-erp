import { CommonModule, TitleCasePipe } from '@angular/common';
import { Component, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { MockSeedService } from '../../../../core/services/mock-seed.service';
import { StatusChip } from '../../../../shared/components/status-chip/status-chip';
import { InrPipe } from '../../../../shared/pipes/inr.pipe';

interface OperationRow {
  ref: string;
  name: string;
  category: string;
  owner: string;
  status: string;
  amount?: number;
}

@Component({
  selector: 'app-operation-page',
  standalone: true,
  imports: [CommonModule, TitleCasePipe, ButtonModule, TableModule, StatusChip, InrPipe],
  templateUrl: './operation-page.html',
  styleUrl: './operation-page.scss',
})
export class OperationPage {
  readonly module = computed(() => this.route.snapshot.paramMap.get('module') ?? 'operations');
  readonly title = computed(() => this.module().replace(/-/g, ' '));
  readonly rows = computed<OperationRow[]>(() => this.resolveRows());

  constructor(
    private readonly route: ActivatedRoute,
    private readonly seed: MockSeedService,
  ) {}

  private resolveRows(): OperationRow[] {
    const module = this.module();

    if (module.includes('shipment')) {
      return this.seed.shipments.entities().map((shipment) => ({
        ref: shipment.trackingNo,
        name: shipment.orderNo,
        category: shipment.carrier,
        owner: shipment.customerName,
        status: shipment.status,
      }));
    }

    if (module.includes('vendor')) {
      return this.seed.suppliers.entities().map((supplier) => ({
        ref: supplier.id,
        name: supplier.name,
        category: supplier.category,
        owner: supplier.contact,
        status: supplier.outstanding > 0 ? 'Payable' : 'Clear',
        amount: supplier.outstanding,
      }));
    }

    if (module.includes('purchase')) {
      return this.seed.expenses.entities().map((expense) => ({
        ref: expense.id,
        name: expense.vendor,
        category: expense.category,
        owner: expense.paymentMode,
        status: 'Recorded',
        amount: expense.amount,
      }));
    }

    return this.seed.orders.entities().map((order) => ({
      ref: order.orderNo,
      name: order.customerName,
      category: order.type,
      owner: order.channel,
      status: order.status,
      amount: order.total,
    }));
  }
}
