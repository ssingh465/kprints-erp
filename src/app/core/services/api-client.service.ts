import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiClientService {
  readonly baseUrl = environment.apiBaseUrl;

  get<T>(_path: string): Observable<T> {
    return throwError(() => new Error('FastAPI integration is not enabled yet.'));
  }

  post<T>(_path: string, _payload: unknown): Observable<T> {
    return throwError(() => new Error('FastAPI integration is not enabled yet.'));
  }

  put<T>(_path: string, _payload: unknown): Observable<T> {
    return throwError(() => new Error('FastAPI integration is not enabled yet.'));
  }

  delete<T>(_path: string): Observable<T> {
    return throwError(() => new Error('FastAPI integration is not enabled yet.'));
  }
}
