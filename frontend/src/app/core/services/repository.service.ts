import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize, map, tap } from 'rxjs/operators';
import { BaseEntity } from '../../models/erp.models';
import { ApiClientService } from './api-client.service';
import { ToastService } from './toast.service';

const API_COLLECTION_PATHS: Record<string, string> = {
  'print-jobs': 'production',
};

const ENTITY_LABELS: Record<string, string> = {
  customers: 'Customer',
  orders: 'Order',
  posters: 'Poster',
  inventory: 'Inventory item',
  expenses: 'Expense',
  shipments: 'Shipment',
  suppliers: 'Supplier',
  coupons: 'Coupon',
  'print-jobs': 'Production job',
};

export interface Repository<T extends BaseEntity> {
  readonly entities: WritableSignal<T[]>;
  readonly loading: WritableSignal<boolean>;
  list(): Observable<T[]>;
  snapshot(): T[];
  save(entity: T): Observable<T>;
  remove(id: string): Observable<void>;
  refresh(): void;
}

@Injectable({ providedIn: 'root' })
export class RepositoryFactory {
  private readonly api = inject(ApiClientService);
  private readonly toast = inject(ToastService);

  create<T extends BaseEntity>(collection: string): Repository<T> {
    return new ApiRepository<T>(collection, this.api, this.toast);
  }
}

export class ApiRepository<T extends BaseEntity> implements Repository<T> {
  readonly entities = signal<T[]>([]);
  readonly loading = signal(true);
  private readonly apiPath: string;
  private readonly label: string;

  constructor(
    private readonly collection: string,
    private readonly api: ApiClientService,
    private readonly toast: ToastService,
  ) {
    this.apiPath = API_COLLECTION_PATHS[collection] ?? collection;
    this.label = ENTITY_LABELS[collection] ?? 'Record';
    this.refresh();
  }

  refresh(): void {
    this.list().subscribe();
  }

  list(): Observable<T[]> {
    this.loading.set(true);
    return this.api.get<T[]>(`/${this.apiPath}`).pipe(
      map((data) => {
        this.entities.set(data);
        return data;
      }),
      finalize(() => this.loading.set(false)),
    );
  }

  snapshot(): T[] {
    return this.entities();
  }

  save(entity: T): Observable<T> {
    const exists = !!entity.id && this.snapshot().some((item) => item.id === entity.id);
    const request$ = exists
      ? this.api.put<T>(`/${this.apiPath}/${entity.id}`, entity)
      : this.api.post<T>(`/${this.apiPath}`, entity);

    return request$.pipe(
      tap(() => {
        this.toast.success(
          exists ? `${this.label} updated` : `${this.label} created`,
          exists ? 'Changes saved successfully.' : 'Record added successfully.',
        );
      }),
      catchError((err) => {
        const detail = err?.error?.message ?? err?.message ?? 'Please try again.';
        this.toast.error(`${this.label} save failed`, detail);
        return throwError(() => err);
      }),
      map((saved) => {
        this.refresh();
        return saved;
      }),
    );
  }

  remove(id: string): Observable<void> {
    return this.api.delete<void>(`/${this.apiPath}/${id}`).pipe(
      tap(() => {
        this.toast.success(`${this.label} deleted`, 'Record removed successfully.');
      }),
      catchError((err) => {
        const detail = err?.error?.message ?? err?.message ?? 'Please try again.';
        this.toast.error(`${this.label} delete failed`, detail);
        return throwError(() => err);
      }),
      map(() => {
        this.entities.set(this.snapshot().filter((item) => item.id !== id));
      }),
    );
  }
}
