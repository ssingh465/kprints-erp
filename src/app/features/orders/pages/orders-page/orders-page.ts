import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TimelineModule } from 'primeng/timeline';
import { TooltipModule } from 'primeng/tooltip';
import { MockSeedService } from '../../../../core/services/mock-seed.service';
import { Order, OrderStatus } from '../../../../models/erp.models';
import { StatusChip } from '../../../../shared/components/status-chip/status-chip';
import { InrPipe } from '../../../../shared/pipes/inr.pipe';

@Component({
  selector: 'app-orders-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TableModule,
    TimelineModule,
    TooltipModule,
    StatusChip,
    InrPipe,
  ],
  templateUrl: './orders-page.html',
  styleUrl: './orders-page.scss',
})
export class OrdersPage {
  readonly search = signal('');
  readonly selectedStatus = signal<OrderStatus | 'All'>('All');
  readonly selectedOrder = signal<Order | null>(null);
  readonly dialogOpen = signal(false);

  readonly statuses: Array<OrderStatus | 'All'> = [
    'All',
    'Draft',
    'Design Pending',
    'Design Approved',
    'Printing Queued',
    'Printing In Progress',
    'Lamination',
    'Framing',
    'Packaging',
    'Ready for Pickup',
    'Ready for Shipping',
    'Delivered',
    'Cancelled',
  ];

  readonly orders = computed(() => this.seed.orders.entities());
  readonly filteredOrders = computed(() => {
    const query = this.search().trim().toLowerCase();
    const status = this.selectedStatus();

    return this.orders().filter((order) => {
      const matchesQuery =
        !query ||
        order.orderNo.toLowerCase().includes(query) ||
        order.customerName.toLowerCase().includes(query) ||
        order.type.toLowerCase().includes(query);
      const matchesStatus = status === 'All' || order.status === status;
      return matchesQuery && matchesStatus;
    });
  });

  readonly timeline = computed(() => {
    const order = this.selectedOrder();

    if (!order) {
      return [];
    }

    return [
      { status: 'Draft', date: order.createdAt },
      { status: 'Design Pending', date: order.createdAt },
      { status: order.status, date: order.updatedAt },
      { status: 'Delivered', date: order.dueDate },
    ];
  });

  constructor(private readonly seed: MockSeedService) {}

  openOrder(order: Order): void {
    this.selectedOrder.set(order);
    this.dialogOpen.set(true);
  }
}
