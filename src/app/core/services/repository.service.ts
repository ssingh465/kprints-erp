import { Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { BaseEntity } from '../../models/erp.models';
import { StorageService } from './storage.service';

export interface Repository<T extends BaseEntity> {
  list(): Observable<T[]>;
  snapshot(): T[];
  save(entity: T): Observable<T>;
  bulkSave(entities: T[]): Observable<T[]>;
  remove(id: string): Observable<void>;
}

@Injectable({ providedIn: 'root' })
export class RepositoryFactory {
  constructor(private readonly storage: StorageService) {}

  create<T extends BaseEntity>(collection: string): LocalStorageRepository<T> {
    return new LocalStorageRepository<T>(collection, this.storage);
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
