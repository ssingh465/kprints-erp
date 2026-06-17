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
import { ToastService } from '../../../../core/services/toast.service';
import { Supplier, SupplierPayment } from '../../../../models/erp.models';
import { PAYMENT_METHODS } from '../../../../shared/erp.constants';
import { StatusChip } from '../../../../shared/components/status-chip/status-chip';
import { TablePanelSkeleton } from '../../../../shared/components/table-panel-skeleton/table-panel-skeleton';
import { InrPipe } from '../../../../shared/pipes/inr.pipe';

@Component({
  selector: 'app-vendors-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, SelectModule, TableModule, StatusChip, InrPipe, TablePanelSkeleton],
  templateUrl: './vendors-page.html',
  styleUrl: './vendors-page.scss',
})
export class VendorsPage {
  private readonly data = inject(ErpDataService);
  private readonly api = inject(ApiClientService);
  private readonly toast = inject(ToastService);

  readonly search = signal('');
  readonly loading = computed(() => this.data.suppliers.loading());
  readonly suppliers = computed(() => this.data.suppliers.entities());
  readonly filtered = computed(() => {
    const q = this.search().toLowerCase();
    return this.suppliers().filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.contact.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q),
    );
  });

  readonly paymentMethods = [...PAYMENT_METHODS];

  dialogOpen = false;
  paymentDialogOpen = false;
  selectedSupplier: Supplier | null = null;
  supplierPayments = signal<SupplierPayment[]>([]);
  newSupplier: Partial<Supplier> = this.empty();
  paymentForm = {
    amount: 0,
    method: 'Bank Transfer' as (typeof PAYMENT_METHODS)[number],
    notes: '',
  };

  openAdd(): void {
    this.newSupplier = this.empty();
    this.dialogOpen = true;
  }

  save(): void {
    const data = {
      ...this.newSupplier,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Supplier;
    this.data.suppliers.save(data).subscribe(() => (this.dialogOpen = false));
  }

  openPayment(supplier: Supplier): void {
    this.selectedSupplier = supplier;
    this.paymentForm = {
      amount: Math.max(0, supplier.outstanding),
      method: 'Bank Transfer',
      notes: '',
    };
    this.api.get<SupplierPayment[]>(`/payments/suppliers/${supplier.id}`).subscribe({
      next: (payments) => this.supplierPayments.set(payments),
      error: () => this.supplierPayments.set([]),
    });
    this.paymentDialogOpen = true;
  }

  savePayment(): void {
    if (!this.selectedSupplier || this.paymentForm.amount <= 0) return;

    this.api
      .post(`/payments/suppliers/${this.selectedSupplier.id}`, {
        amount: Number(this.paymentForm.amount),
        method: this.paymentForm.method,
        notes: this.paymentForm.notes || undefined,
      })
      .subscribe({
        next: () => {
          this.toast.success('Payment recorded', `₹${this.paymentForm.amount} paid to ${this.selectedSupplier!.name}.`);
          this.paymentDialogOpen = false;
          this.data.suppliers.refresh();
        },
        error: (err) => this.toast.error('Payment failed', err.message || 'Could not record payment.'),
      });
  }

  private empty(): Partial<Supplier> {
    return { name: '', contact: '', phone: '', category: 'Paper rolls supplier', outstanding: 0 };
  }
}
