import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  Customer,
  Expense,
  InventoryItem,
  MonthlyMetric,
  Order,
  Poster,
  PrintJob,
  Shipment,
  Supplier,
} from '../../models/erp.models';
import { RepositoryFactory } from './repository.service';
import { StorageService } from './storage.service';
import {
  mockCustomers,
  mockExpenses,
  mockInventory,
  mockMonthlyMetrics,
  mockOrders,
  mockPosters,
  mockPrintJobs,
  mockShipments,
  mockSuppliers,
} from '../../mock-data/seed-data';

@Injectable({ providedIn: 'root' })
export class MockSeedService {
  private readonly repositories = inject(RepositoryFactory);
  private readonly storage = inject(StorageService);

  readonly customers = this.repositories.create<Customer>('customers');
  readonly orders = this.repositories.create<Order>('orders');
  readonly posters = this.repositories.create<Poster>('posters');
  readonly inventory = this.repositories.create<InventoryItem>('inventory');
  readonly suppliers = this.repositories.create<Supplier>('suppliers');
  readonly expenses = this.repositories.create<Expense>('expenses');
  readonly printJobs = this.repositories.create<PrintJob>('print-jobs');
  readonly shipments = this.repositories.create<Shipment>('shipments');
  readonly monthlyMetrics = this.repositories.create<MonthlyMetric & { id: string; createdAt: string; updatedAt: string }>(
    'monthly-metrics',
  );

  ensureSeeded(): void {
    if (environment.storageMode === 'api') {
      return;
    }
    if (this.storage.get('seeded', false)) {
      return;
    }

    this.customers.bulkSave(mockCustomers);
    this.orders.bulkSave(mockOrders);
    this.posters.bulkSave(mockPosters);
    this.inventory.bulkSave(mockInventory);
    this.suppliers.bulkSave(mockSuppliers);
    this.expenses.bulkSave(mockExpenses);
    this.printJobs.bulkSave(mockPrintJobs);
    this.shipments.bulkSave(mockShipments);
    this.monthlyMetrics.bulkSave(mockMonthlyMetrics);
    this.storage.set('seeded', true);
  }

  reset(): void {
    this.storage.clearAppData();
    this.ensureSeeded();
  }
}
