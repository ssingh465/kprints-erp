import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TimelineModule } from 'primeng/timeline';
import { TooltipModule } from 'primeng/tooltip';
import { ApiClientService } from '../../../../core/services/api-client.service';
import { ErpDataService } from '../../../../core/services/erp-data.service';
import { PeriodService } from '../../../../core/services/period.service';
import { Order, OrderListResponse, OrderPayment, OrderStatus } from '../../../../models/erp.models';
import { PeriodSelector } from '../../../../shared/components/period-selector/period-selector';
import { StatusChip } from '../../../../shared/components/status-chip/status-chip';
import { TablePanelSkeleton } from '../../../../shared/components/table-panel-skeleton/table-panel-skeleton';
import { InrPipe } from '../../../../shared/pipes/inr.pipe';
import { PermissionDirective } from '../../../../core/directives/permission.directive';
import { ToastService } from '../../../../core/services/toast.service';
import { ORDER_STATUSES, PAYMENT_METHODS } from '../../../../shared/erp.constants';

@Component({
  selector: 'app-orders-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    TableModule,
    TimelineModule,
    TooltipModule,
    StatusChip,
    InrPipe,
    PeriodSelector,
    TablePanelSkeleton,
    PermissionDirective,
  ],
  templateUrl: './orders-page.html',
  styleUrl: './orders-page.scss',
})
export class OrdersPage implements OnInit {
  private readonly api = inject(ApiClientService);
  private readonly data = inject(ErpDataService);
  private readonly period = inject(PeriodService);
  private readonly toast = inject(ToastService);

  readonly search = signal('');
  readonly selectedStatus = signal<OrderStatus | 'All'>('All');
  readonly selectedOrder = signal<Order | null>(null);
  readonly orderPayments = signal<OrderPayment[]>([]);
  readonly dialogOpen = signal(false);
  readonly paymentDialogOpen = signal(false);
  readonly orders = signal<Order[]>([]);
  readonly ordersLoading = signal(false);
  readonly periodLabel = computed(() => this.period.label());

  readonly statuses: Array<OrderStatus | 'All'> = ['All', ...ORDER_STATUSES];
  readonly paymentMethods = [...PAYMENT_METHODS];

  paymentForm = {
    amount: 0,
    method: 'UPI' as (typeof PAYMENT_METHODS)[number],
    notes: '',
  };

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

  createOrderOpen = false;
  newOrder = this.emptyOrder();
  readonly customersList = computed(() => this.data.customers.entities());
  readonly customerOptions = computed(() =>
    this.customersList().map((customer) => ({
      label: `${customer.name} (${customer.city})`,
      value: customer.id,
    })),
  );
  readonly orderTypes = ['Ready-made', 'Custom Design', 'Personalized'];
  readonly channels = ['Offline', 'Website', 'Marketplace'];
  readonly priorities = ['Normal', 'High', 'Rush'];
  readonly framingOptions = ['None', 'Black Frame', 'Canvas', 'Wooden Frame'];

  ngOnInit(): void {
    this.loadOrders();
  }

  onPeriodChange(): void {
    this.loadOrders();
  }

  private loadOrders(): void {
    this.ordersLoading.set(true);
    this.api.get<OrderListResponse>(`/orders?limit=500&${this.period.queryString()}`).subscribe({
      next: (result) => {
        this.orders.set(result.items);
        this.period.setActiveMeta(result.period);
        this.ordersLoading.set(false);
      },
      error: () => {
        this.orders.set([]);
        this.ordersLoading.set(false);
      },
    });
  }

  private emptyOrder(): any {
    return {
      customerId: '',
      type: 'Ready-made',
      channel: 'Offline',
      priority: 'Normal',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      lineDescription: 'Custom Premium Poster',
      lineSize: 'A3',
      lineQuantity: 1,
      lineUnitPrice: 299,
      lineFraming: 'None',
      paid: 0,
    };
  }

  openCreateOrder(): void {
    const list = this.customersList();
    this.newOrder = this.emptyOrder();
    if (list.length > 0) {
      this.newOrder.customerId = list[0].id;
    }
    this.createOrderOpen = true;
  }

  saveOrder(): void {
    const lineTotal = this.newOrder.lineQuantity * this.newOrder.lineUnitPrice;
    const lines = [
      {
        description: this.newOrder.lineDescription,
        size: this.newOrder.lineSize,
        quantity: this.newOrder.lineQuantity,
        unitPrice: this.newOrder.lineUnitPrice,
        framing: this.newOrder.lineFraming || 'No frame',
      },
    ];

    this.api
      .post<Order>('/orders', {
        customerId: this.newOrder.customerId,
        type: this.newOrder.type,
        channel: this.newOrder.channel,
        priority: this.newOrder.priority,
        dueDate: new Date(this.newOrder.dueDate).toISOString(),
        total: lineTotal,
        paid: this.newOrder.paid || 0,
        lines,
      })
      .subscribe({
        next: () => {
          this.data.orders.refresh();
          this.loadOrders();
          this.createOrderOpen = false;
        },
        error: (err) => console.error('Failed to save order', err),
      });
  }

  openOrder(order: Order): void {
    this.api.get<Order>(`/orders/${order.id}`).subscribe({
      next: (full) => {
        this.selectedOrder.set(full);
        this.orderPayments.set(full.payments ?? []);
        this.dialogOpen.set(true);
      },
      error: () => {
        this.selectedOrder.set(order);
        this.orderPayments.set([]);
        this.dialogOpen.set(true);
      },
    });
  }

  openRecordPayment(): void {
    const order = this.selectedOrder();
    if (!order) return;
    const balance = Math.max(0, order.total - order.paid);
    this.paymentForm = { amount: balance, method: 'UPI', notes: '' };
    this.paymentDialogOpen.set(true);
  }

  savePayment(): void {
    const order = this.selectedOrder();
    if (!order || this.paymentForm.amount <= 0) return;

    this.api
      .post(`/payments/orders/${order.id}`, {
        amount: Number(this.paymentForm.amount),
        method: this.paymentForm.method,
        notes: this.paymentForm.notes || undefined,
      })
      .subscribe({
        next: () => {
          this.toast.success('Payment recorded', `₹${this.paymentForm.amount} applied to ${order.orderNo}.`);
          this.paymentDialogOpen.set(false);
          this.openOrder(order);
          this.loadOrders();
        },
        error: (err) => {
          this.toast.error('Payment failed', err.message || 'Could not record payment.');
        },
      });
  }

  createInvoice(): void {
    const order = this.selectedOrder();
    if (!order) return;

    this.api.post('/invoices', { orderId: order.id }).subscribe({
      next: () => {
        this.toast.success('Invoice created', `Invoice generated for ${order.orderNo}.`);
      },
      error: (err) => {
        this.toast.error('Invoice failed', err.message || 'Could not create invoice.');
      },
    });
  }
}
