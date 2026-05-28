import { Injectable, inject } from '@angular/core';
import {
  ArtworkUpload,
  Coupon,
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

@Injectable({ providedIn: 'root' })
export class ErpDataService {
  private readonly repositories = inject(RepositoryFactory);

  readonly customers = this.repositories.create<Customer>('customers');
  readonly orders = this.repositories.create<Order>('orders');
  readonly posters = this.repositories.create<Poster>('posters');
  readonly inventory = this.repositories.create<InventoryItem>('inventory');
  readonly suppliers = this.repositories.create<Supplier>('suppliers');
  readonly expenses = this.repositories.create<Expense>('expenses');
  readonly printJobs = this.repositories.create<PrintJob>('print-jobs');
  readonly shipments = this.repositories.create<Shipment>('shipments');
  readonly coupons = this.repositories.create<Coupon>('coupons');
  readonly artworks = this.repositories.create<ArtworkUpload>('artworks');
  readonly monthlyMetrics = this.repositories.create<
    MonthlyMetric & { id: string; createdAt: string; updatedAt: string }
  >('monthly-metrics');
}
