import { CommonModule, TitleCasePipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ErpDataService } from '../../../../core/services/erp-data.service';
import { StatusChip } from '../../../../shared/components/status-chip/status-chip';
import { TablePanelSkeleton } from '../../../../shared/components/table-panel-skeleton/table-panel-skeleton';
import { InrPipe } from '../../../../shared/pipes/inr.pipe';
import { Shipment, Supplier, Expense } from '../../../../models/erp.models';

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
  imports: [
    CommonModule,
    FormsModule,
    TitleCasePipe,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    TableModule,
    StatusChip,
    InrPipe,
    TablePanelSkeleton,
  ],
  templateUrl: './operation-page.html',
  styleUrl: './operation-page.scss',
})
export class OperationPage {
  readonly dataSourceLabel = 'Hono API · PostgreSQL';
  readonly carrierOptions = [
    { label: 'Delhivery', value: 'Delhivery' },
    { label: 'DHL Express', value: 'DHL' },
    { label: 'FedEx', value: 'FedEx' },
    { label: 'BlueDart', value: 'BlueDart' },
  ];
  readonly shipStatuses = ['Packed', 'In Transit', 'Out for Delivery', 'Delivered'];
  readonly expenseCategoryOptions = [
    { label: 'Materials & Inventory', value: 'Materials' },
    { label: 'Logistics & Packaging', value: 'Logistics' },
    { label: 'Operations Salaries', value: 'Salaries' },
    { label: 'Marketing / Ads', value: 'Marketing' },
    { label: 'Utilities & Rent', value: 'Utilities' },
  ];
  readonly paymentModes = ['UPI', 'Cash', 'Card', 'Bank Transfer'];

  readonly module = computed(() => this.route.snapshot.paramMap.get('module') ?? 'operations');
  readonly title = computed(() => this.module().replace(/-/g, ' '));
  readonly loading = computed(() => {
    const module = this.module();
    if (module.includes('shipment')) {
      return this.data.shipments.loading();
    }
    if (module.includes('vendor')) {
      return this.data.suppliers.loading();
    }
    if (module.includes('purchase')) {
      return this.data.expenses.loading();
    }
    return this.data.orders.loading();
  });
  readonly rows = computed<OperationRow[]>(() => this.resolveRows());

  dialogOpen = false;
  newRecord: any = {};

  constructor(
    private readonly route: ActivatedRoute,
    private readonly data: ErpDataService,
  ) {}

  openNewRecord(): void {
    const mod = this.module();
    this.newRecord = {};

    if (mod.includes('shipment') || mod.includes('print-queue')) {
      this.newRecord = {
        orderNo: 'ORD-' + Math.floor(1000 + Math.random() * 9000),
        customerName: '',
        carrier: 'Delhivery',
        trackingNo: 'TRK' + Math.floor(100000 + Math.random() * 900000),
        status: 'Packed',
        city: '',
        eta: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      };
    } else if (mod.includes('vendor')) {
      this.newRecord = {
        name: '',
        contact: '',
        phone: '',
        category: 'Paper rolls supplier',
        outstanding: 0,
      };
    } else if (mod.includes('purchase')) {
      this.newRecord = {
        date: new Date().toISOString().split('T')[0],
        category: 'Materials',
        vendor: '',
        amount: 500,
        paymentMode: 'UPI',
        notes: 'Consumables restocking',
      };
    }
    this.dialogOpen = true;
  }

  saveRecord(): void {
    const mod = this.module();
    if (mod.includes('shipment')) {
      const data = {
        ...this.newRecord,
        id: crypto.randomUUID(),
        eta: new Date(this.newRecord.eta).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Shipment;
      this.data.shipments.save(data).subscribe(() => (this.dialogOpen = false));
    } else if (mod.includes('vendor')) {
      const data = {
        ...this.newRecord,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Supplier;
      this.data.suppliers.save(data).subscribe(() => (this.dialogOpen = false));
    } else if (mod.includes('purchase')) {
      const data = {
        ...this.newRecord,
        id: crypto.randomUUID(),
        date: new Date(this.newRecord.date).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Expense;
      this.data.expenses.save(data).subscribe(() => (this.dialogOpen = false));
    }
  }

  private resolveRows(): OperationRow[] {
    const module = this.module();

    if (module.includes('shipment')) {
      return this.data.shipments.entities().map((shipment) => ({
        ref: shipment.trackingNo,
        name: shipment.orderNo,
        category: shipment.carrier,
        owner: shipment.customerName,
        status: shipment.status,
      }));
    }

    if (module.includes('vendor')) {
      return this.data.suppliers.entities().map((supplier) => ({
        ref: supplier.id,
        name: supplier.name,
        category: supplier.category,
        owner: supplier.contact,
        status: supplier.outstanding > 0 ? 'Payable' : 'Clear',
        amount: supplier.outstanding,
      }));
    }

    if (module.includes('purchase')) {
      return this.data.expenses.entities().map((expense) => ({
        ref: expense.id,
        name: expense.vendor,
        category: expense.category,
        owner: expense.paymentMode,
        status: 'Recorded',
        amount: expense.amount,
      }));
    }

    return this.data.orders.entities().map((order) => ({
      ref: order.orderNo,
      name: order.customerName,
      category: order.type,
      owner: order.channel,
      status: order.status,
      amount: order.total,
    }));
  }
}
