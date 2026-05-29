import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiClientService } from '../../../../core/services/api-client.service';
import { AppRole } from '../../../../core/auth/auth.models';

export type UserRowStatus = 'pending' | 'active' | 'disabled' | 'invited';

export interface UserListItem {
  id: string;
  email: string;
  fullName: string | null;
  role: AppRole;
  status: UserRowStatus;
  isApproved: boolean;
  isActive: boolean;
  createdAt: string;
  type: 'user' | 'invitation';
  invitationId?: string;
}

export interface InvitationValidation {
  valid: boolean;
  expired: boolean;
  email?: string;
  role?: AppRole;
  message?: string;
}

interface ApiListResponse<T> {
  success: boolean;
  data: T;
  pagination: { total: number; page: number; limit: number };
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiClientService);

  listUsers(params?: {
    search?: string;
    role?: AppRole;
    status?: UserRowStatus;
    page?: number;
    limit?: number;
  }): Observable<{ items: UserListItem[]; pagination: { total: number; page: number; limit: number } }> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.role) query.set('role', params.role);
    if (params?.status) query.set('status', params.status);
    query.set('page', String(params?.page ?? 1));
    query.set('limit', String(params?.limit ?? 50));

    return this.http
      .get<ApiListResponse<UserListItem[]>>(`${this.api.baseUrl}/users?${query.toString()}`)
      .pipe(map((res) => ({ items: res.data, pagination: res.pagination })));
  }

  approve(userId: string): Observable<UserListItem> {
    return this.api.patch<UserListItem>(`/users/${userId}/approve`);
  }

  deactivate(userId: string): Observable<UserListItem> {
    return this.api.patch<UserListItem>(`/users/${userId}/deactivate`);
  }

  updateRole(userId: string, role: AppRole): Observable<UserListItem> {
    return this.api.patch<UserListItem>(`/users/${userId}/role`, { role });
  }

  invite(email: string, role: AppRole): Observable<unknown> {
    return this.api.post('/invitations', { email, role });
  }

  resendInvite(invitationId: string): Observable<unknown> {
    return this.api.post(`/invitations/${invitationId}/resend`, {});
  }

  revokeInvite(invitationId: string): Observable<unknown> {
    return this.api.delete(`/invitations/${invitationId}`);
  }

  validateInvite(token: string): Observable<InvitationValidation> {
    return this.api.get<InvitationValidation>(
      `/invitations/validate?token=${encodeURIComponent(token)}`
    );
  }
}
