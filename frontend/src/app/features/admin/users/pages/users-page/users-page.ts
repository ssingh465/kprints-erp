import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { AppRole, ROLE_LABELS } from '../../../../../core/auth/auth.models';
import { SessionService } from '../../../../../core/auth/session.service';
import { TablePanelSkeleton } from '../../../../../shared/components/table-panel-skeleton/table-panel-skeleton';
import { UsersService, UserListItem, UserRowStatus } from '../../services/users.service';

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    TableModule,
    TagModule,
    TablePanelSkeleton,
  ],
  templateUrl: './users-page.html',
  styleUrl: './users-page.scss',
})
export class UsersPage implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly messages = inject(MessageService);
  private readonly session = inject(SessionService);

  readonly loading = signal(true);
  readonly rows = signal<UserListItem[]>([]);
  readonly total = signal(0);

  search = '';
  roleFilter: AppRole | null = null;
  statusFilter: UserRowStatus | null = null;

  readonly roleOptions = (Object.keys(ROLE_LABELS) as AppRole[]).map((role) => ({
    label: ROLE_LABELS[role],
    value: role,
  }));

  readonly statusOptions: { label: string; value: UserRowStatus }[] = [
    { label: 'Active', value: 'active' },
    { label: 'Pending', value: 'pending' },
    { label: 'Disabled', value: 'disabled' },
    { label: 'Invited', value: 'invited' },
  ];

  inviteOpen = false;
  inviteEmail = '';
  inviteRole: AppRole = 'VIEWER';
  inviteSubmitting = false;

  roleDialogOpen = false;
  roleTarget: UserListItem | null = null;
  roleValue: AppRole = 'VIEWER';
  roleSubmitting = false;

  deactivateDialogOpen = false;
  deactivateTarget: UserListItem | null = null;
  deactivateSubmitting = false;

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.usersService
      .listUsers({
        search: this.search || undefined,
        role: this.roleFilter ?? undefined,
        status: this.statusFilter ?? undefined,
      })
      .subscribe({
        next: ({ items }) => {
          const visible = this.excludeCurrentUser(items);
          this.rows.set(visible);
          this.total.set(visible.length);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.messages.add({
            severity: 'error',
            summary: 'Load failed',
            detail: 'Could not load users. Please try again.',
          });
        },
      });
  }

  onFilterChange(): void {
    this.loadUsers();
  }

  /** Hide the signed-in admin from the table (no self deactivate / role change). */
  private excludeCurrentUser(items: UserListItem[]): UserListItem[] {
    const me = this.session.appUser();
    if (!me) {
      return items;
    }

    const myId = me.id;
    const myEmail = me.email.toLowerCase();

    return items.filter((row) => {
      if (row.type === 'user' && row.id === myId) {
        return false;
      }
      if (row.email.toLowerCase() === myEmail) {
        return false;
      }
      return true;
    });
  }

  roleLabel(role: AppRole): string {
    return ROLE_LABELS[role];
  }

  statusLabel(status: UserRowStatus): string {
    const labels: Record<UserRowStatus, string> = {
      active: 'Active',
      pending: 'Pending',
      disabled: 'Disabled',
      invited: 'Invited',
    };
    return labels[status];
  }

  statusSeverity(status: UserRowStatus): 'success' | 'warn' | 'danger' | 'info' {
    switch (status) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warn';
      case 'disabled':
        return 'danger';
      case 'invited':
        return 'info';
    }
  }

  openInvite(): void {
    this.inviteEmail = '';
    this.inviteRole = 'VIEWER';
    this.inviteOpen = true;
  }

  submitInvite(): void {
    if (!this.inviteEmail.trim()) return;

    this.inviteSubmitting = true;
    this.usersService.invite(this.inviteEmail.trim(), this.inviteRole).subscribe({
      next: () => {
        this.inviteSubmitting = false;
        this.inviteOpen = false;
        this.messages.add({
          severity: 'success',
          summary: 'Invitation sent',
          detail: `An invite was sent to ${this.inviteEmail}.`,
        });
        this.loadUsers();
      },
      error: (err) => {
        this.inviteSubmitting = false;
        const detail =
          err?.error?.message ?? 'Could not send invitation. Please try again.';
        this.messages.add({ severity: 'error', summary: 'Invite failed', detail });
      },
    });
  }

  approveUser(row: UserListItem): void {
    this.usersService.approve(row.id).subscribe({
      next: () => {
        this.messages.add({
          severity: 'success',
          summary: 'User approved',
          detail: `${row.email} can now access the ERP.`,
        });
        this.loadUsers();
      },
      error: () => {
        this.messages.add({
          severity: 'error',
          summary: 'Approval failed',
          detail: 'Could not approve this user.',
        });
      },
    });
  }

  openRoleDialog(row: UserListItem): void {
    this.roleTarget = row;
    this.roleValue = row.role;
    this.roleDialogOpen = true;
  }

  submitRoleChange(): void {
    if (!this.roleTarget) return;

    this.roleSubmitting = true;
    this.usersService.updateRole(this.roleTarget.id, this.roleValue).subscribe({
      next: () => {
        this.roleSubmitting = false;
        this.roleDialogOpen = false;
        this.messages.add({
          severity: 'success',
          summary: 'Role updated',
          detail: `${this.roleTarget!.email} is now ${ROLE_LABELS[this.roleValue]}.`,
        });
        this.loadUsers();
      },
      error: (err) => {
        this.roleSubmitting = false;
        const detail = err?.error?.message ?? 'Could not update role.';
        this.messages.add({ severity: 'error', summary: 'Update failed', detail });
      },
    });
  }

  openDeactivateDialog(row: UserListItem): void {
    this.deactivateTarget = row;
    this.deactivateDialogOpen = true;
  }

  confirmDeactivate(): void {
    if (!this.deactivateTarget) return;

    this.deactivateSubmitting = true;
    this.usersService.deactivate(this.deactivateTarget.id).subscribe({
      next: () => {
        this.deactivateSubmitting = false;
        this.deactivateDialogOpen = false;
        this.messages.add({
          severity: 'success',
          summary: 'User deactivated',
          detail: `${this.deactivateTarget!.email} can no longer sign in.`,
        });
        this.loadUsers();
      },
      error: (err) => {
        this.deactivateSubmitting = false;
        const detail = err?.error?.message ?? 'Could not deactivate user.';
        this.messages.add({ severity: 'error', summary: 'Action failed', detail });
      },
    });
  }

  resendInvite(row: UserListItem): void {
    const invitationId = row.invitationId ?? row.id;
    this.usersService.resendInvite(invitationId).subscribe({
      next: () => {
        this.messages.add({
          severity: 'success',
          summary: 'Invitation resent',
          detail: `A new invite email was sent to ${row.email}.`,
        });
      },
      error: () => {
        this.messages.add({
          severity: 'error',
          summary: 'Resend failed',
          detail: 'Could not resend the invitation.',
        });
      },
    });
  }

  revokeInvite(row: UserListItem): void {
    const invitationId = row.invitationId ?? row.id;
    this.usersService.revokeInvite(invitationId).subscribe({
      next: () => {
        this.messages.add({
          severity: 'success',
          summary: 'Invitation revoked',
          detail: `The invite for ${row.email} was removed.`,
        });
        this.loadUsers();
      },
      error: () => {
        this.messages.add({
          severity: 'error',
          summary: 'Revoke failed',
          detail: 'Could not revoke the invitation.',
        });
      },
    });
  }
}
