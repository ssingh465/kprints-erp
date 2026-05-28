import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { Observable } from 'rxjs';
import { finalize, map } from 'rxjs/operators';
import { BaseEntity } from '../../models/erp.models';
import { ApiClientService } from './api-client.service';

const API_COLLECTION_PATHS: Record<string, string> = {
  'print-jobs': 'production',
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

  create<T extends BaseEntity>(collection: string): Repository<T> {
    return new ApiRepository<T>(collection, this.api);
  }
}

export class ApiRepository<T extends BaseEntity> implements Repository<T> {
  readonly entities = signal<T[]>([]);
  readonly loading = signal(true);
  private readonly apiPath: string;

  constructor(
    private readonly collection: string,
    private readonly api: ApiClientService,
  ) {
    this.apiPath = API_COLLECTION_PATHS[collection] ?? collection;
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
      map((saved) => {
        this.refresh();
        return saved;
      }),
    );
  }

  remove(id: string): Observable<void> {
    return this.api.delete<void>(`/${this.apiPath}/${id}`).pipe(
      map(() => {
        this.entities.set(this.snapshot().filter((item) => item.id !== id));
      }),
    );
  }
}
