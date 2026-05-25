import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseEntity } from '../../models/erp.models';
import { StorageService } from './storage.service';
import { ApiClientService } from './api-client.service';
import { environment } from '../../../environments/environment';

export interface Repository<T extends BaseEntity> {
  readonly entities: WritableSignal<T[]>;
  list(): Observable<T[]>;
  snapshot(): T[];
  save(entity: T): Observable<T>;
  bulkSave(entities: T[]): Observable<T[]>;
  remove(id: string): Observable<void>;
}

@Injectable({ providedIn: 'root' })
export class RepositoryFactory {
  private readonly storage = inject(StorageService);
  private readonly api = inject(ApiClientService);

  create<T extends BaseEntity>(collection: string): Repository<T> {
    if (environment.storageMode === 'api') {
      return new ApiRepository<T>(collection, this.api);
    }
    return new LocalStorageRepository<T>(collection, this.storage);
  }
}

export class ApiRepository<T extends BaseEntity> implements Repository<T> {
  readonly entities = signal<T[]>([]);

  constructor(
    private readonly collection: string,
    private readonly api: ApiClientService,
  ) {
    this.refresh();
  }

  refresh(): void {
    this.list().subscribe();
  }

  list(): Observable<T[]> {
    return this.api.get<T[]>(`/${this.collection}`).pipe(
      map((data) => {
        this.entities.set(data);
        return data;
      })
    );
  }

  snapshot(): T[] {
    return this.entities();
  }

  save(entity: T): Observable<T> {
    const exists = this.snapshot().some((item) => item.id === entity.id);
    const request$ = exists
      ? this.api.put<T>(`/${this.collection}/${entity.id}`, entity)
      : this.api.post<T>(`/${this.collection}`, entity);

    return request$.pipe(
      map((saved) => {
        // Trigger background list refresh to capture any auto-calculated values
        this.refresh();
        return saved;
      })
    );
  }

  bulkSave(entities: T[]): Observable<T[]> {
    // For setup mode or mock data, backend seeder is used.
    // In Angular, we will support direct listing caching for bulk.
    this.entities.set(entities);
    return of(entities);
  }

  remove(id: string): Observable<void> {
    return this.api.delete<void>(`/${this.collection}/${id}`).pipe(
      map(() => {
        this.entities.set(this.snapshot().filter((item) => item.id !== id));
      })
    );
  }
}

export class LocalStorageRepository<T extends BaseEntity> implements Repository<T> {
  readonly entities = signal<T[]>([]);

  constructor(
    private readonly collection: string,
    private readonly storage: StorageService,
  ) {
    this.entities.set(this.storage.get<T[]>(this.collection, []));
  }

  list(): Observable<T[]> {
    return of(this.snapshot());
  }

  snapshot(): T[] {
    return this.entities();
  }

  save(entity: T): Observable<T> {
    const next = this.snapshot().some((item) => item.id === entity.id)
      ? this.snapshot().map((item) => (item.id === entity.id ? entity : item))
      : [entity, ...this.snapshot()];

    this.persist(next);
    return of(entity);
  }

  bulkSave(entities: T[]): Observable<T[]> {
    this.persist(entities);
    return of(entities);
  }

  remove(id: string): Observable<void> {
    this.persist(this.snapshot().filter((item) => item.id !== id));
    return of(void 0);
  }

  private persist(entities: T[]): void {
    this.entities.set(entities);
    this.storage.set(this.collection, entities);
  }
}
