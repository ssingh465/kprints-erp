import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ErpDataService } from '../../../../core/services/erp-data.service';
import { StatusChip } from '../../../../shared/components/status-chip/status-chip';
import { TablePanelSkeleton } from '../../../../shared/components/table-panel-skeleton/table-panel-skeleton';
import { InrPipe } from '../../../../shared/pipes/inr.pipe';
import { Customer } from '../../../../models/erp.models';

@Component({
  selector: 'app-customers-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    TableModule,
    StatusChip,
    InrPipe,
    TablePanelSkeleton,
  ],
  templateUrl: './customers-page.html',
  styleUrl: './customers-page.scss',
})
export class CustomersPage {
  readonly search = signal('');
  readonly loading = computed(() => this.data.customers.loading());
  readonly customers = computed(() => this.data.customers.entities());
  readonly filtered = computed(() => {
    const query = this.search().toLowerCase();
    return this.customers().filter(
      (customer) =>
        customer.name.toLowerCase().includes(query) ||
        customer.city.toLowerCase().includes(query) ||
        customer.phone.includes(query),
    );
  });

  readonly customerSources = ['Offline', 'Website', 'Marketplace'];

  addCustomerOpen = false;
  newCustomer = this.emptyCustomer();

  constructor(private readonly data: ErpDataService) {}

  private emptyCustomer(): Partial<Customer> {
    return {
      name: '',
      phone: '',
      email: '',
      city: '',
      source: 'Offline',
      lifetimeValue: 0,
      orderCount: 0,
    };
  }

  openAddCustomer(): void {
    this.newCustomer = this.emptyCustomer();
    this.addCustomerOpen = true;
  }

  saveCustomer(): void {
    const customerToSave = {
      ...this.newCustomer,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Customer;

    this.data.customers.save(customerToSave).subscribe({
      next: () => {
        this.addCustomerOpen = false;
      },
      error: (err) => {
        console.error('Failed to save customer', err);
      },
    });
  }
}

