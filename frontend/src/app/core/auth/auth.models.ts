export type AppRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER'
  | 'STAFF'
  | 'DESIGNER'
  | 'PRODUCTION_OPERATOR'
  | 'FINANCE'
  | 'VIEWER';

export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  initials: string;
  role: AppRole;
  avatarUrl?: string | null;
  phone?: string | null;
  designation?: string | null;
  department?: string | null;
  isApproved: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum AuthStatus {
  Initializing = 'initializing',
  Authenticated = 'authenticated',
  Unauthenticated = 'unauthenticated',
}

export const ROLE_LABELS: Record<AppRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  STAFF: 'Staff',
  DESIGNER: 'Designer',
  PRODUCTION_OPERATOR: 'Production Operator',
  FINANCE: 'Finance',
  VIEWER: 'Viewer',
};
