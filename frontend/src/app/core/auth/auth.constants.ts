import type { AppRole } from './auth.models';

/**
 * Storage keys (namespaced by StorageService prefix where applicable).
 */
export const AUTH_STORAGE_KEYS = {
  appMode: 'app-mode',
  rememberMe: 'auth.remember-me',
} as const;

export const APP_MODE_DEMO = 'demo';

export type AccessLevel = 'RW' | 'R' | '-';

/**
 * Static role-access matrix, mirrored from the backend `role-access.ts`.
 * Permission-ready: a future permissions table can replace this map without
 * rewriting guards/directives.
 */
export const ROLE_ACCESS: Record<string, Record<AppRole, AccessLevel>> = {
  dashboard: { SUPER_ADMIN: 'RW', ADMIN: 'RW', MANAGER: 'RW', STAFF: 'R', DESIGNER: 'R', PRODUCTION_OPERATOR: 'R', FINANCE: 'R', VIEWER: 'R' },
  orders: { SUPER_ADMIN: 'RW', ADMIN: 'RW', MANAGER: 'RW', STAFF: 'RW', DESIGNER: 'R', PRODUCTION_OPERATOR: 'R', FINANCE: 'R', VIEWER: 'R' },
  customers: { SUPER_ADMIN: 'RW', ADMIN: 'RW', MANAGER: 'RW', STAFF: 'RW', DESIGNER: 'R', PRODUCTION_OPERATOR: 'R', FINANCE: 'R', VIEWER: 'R' },
  catalog: { SUPER_ADMIN: 'RW', ADMIN: 'RW', MANAGER: 'RW', STAFF: 'RW', DESIGNER: 'R', PRODUCTION_OPERATOR: 'R', FINANCE: 'R', VIEWER: 'R' },
  production: { SUPER_ADMIN: 'RW', ADMIN: 'RW', MANAGER: 'RW', STAFF: 'R', DESIGNER: 'R', PRODUCTION_OPERATOR: 'RW', FINANCE: 'R', VIEWER: 'R' },
  'print-queue': { SUPER_ADMIN: 'RW', ADMIN: 'RW', MANAGER: 'RW', STAFF: 'R', DESIGNER: 'R', PRODUCTION_OPERATOR: 'RW', FINANCE: 'R', VIEWER: 'R' },
  inventory: { SUPER_ADMIN: 'RW', ADMIN: 'RW', MANAGER: 'RW', STAFF: 'R', DESIGNER: 'R', PRODUCTION_OPERATOR: 'RW', FINANCE: 'R', VIEWER: 'R' },
  shipments: { SUPER_ADMIN: 'RW', ADMIN: 'RW', MANAGER: 'RW', STAFF: 'R', DESIGNER: 'R', PRODUCTION_OPERATOR: 'RW', FINANCE: 'R', VIEWER: 'R' },
  'artwork-uploads': { SUPER_ADMIN: 'RW', ADMIN: 'RW', MANAGER: 'R', STAFF: 'R', DESIGNER: 'RW', PRODUCTION_OPERATOR: 'R', FINANCE: 'R', VIEWER: 'R' },
  finance: { SUPER_ADMIN: 'RW', ADMIN: 'RW', MANAGER: 'R', STAFF: 'R', DESIGNER: 'R', PRODUCTION_OPERATOR: 'R', FINANCE: 'RW', VIEWER: 'R' },
  purchases: { SUPER_ADMIN: 'RW', ADMIN: 'RW', MANAGER: 'R', STAFF: 'R', DESIGNER: 'R', PRODUCTION_OPERATOR: 'R', FINANCE: 'RW', VIEWER: 'R' },
  vendors: { SUPER_ADMIN: 'RW', ADMIN: 'RW', MANAGER: 'R', STAFF: 'R', DESIGNER: 'R', PRODUCTION_OPERATOR: 'R', FINANCE: 'RW', VIEWER: 'R' },
  coupons: { SUPER_ADMIN: 'RW', ADMIN: 'RW', MANAGER: 'R', STAFF: 'R', DESIGNER: 'R', PRODUCTION_OPERATOR: 'R', FINANCE: 'RW', VIEWER: 'R' },
  reports: { SUPER_ADMIN: 'RW', ADMIN: 'RW', MANAGER: 'R', STAFF: 'R', DESIGNER: 'R', PRODUCTION_OPERATOR: 'R', FINANCE: 'RW', VIEWER: 'R' },
  settings: { SUPER_ADMIN: 'RW', ADMIN: 'RW', MANAGER: 'R', STAFF: '-', DESIGNER: '-', PRODUCTION_OPERATOR: '-', FINANCE: '-', VIEWER: 'R' },
  upload: { SUPER_ADMIN: 'RW', ADMIN: 'RW', MANAGER: 'RW', STAFF: 'RW', DESIGNER: 'RW', PRODUCTION_OPERATOR: 'RW', FINANCE: 'R', VIEWER: 'R' },
  'admin/users': { SUPER_ADMIN: 'RW', ADMIN: '-', MANAGER: '-', STAFF: '-', DESIGNER: '-', PRODUCTION_OPERATOR: '-', FINANCE: '-', VIEWER: '-' },
};

export function canAccessModule(role: AppRole | undefined, module: string): boolean {
  if (!role) return false;
  return (ROLE_ACCESS[module]?.[role] ?? '-') !== '-';
}

export function canWriteModule(role: AppRole | undefined, module: string): boolean {
  if (!role) return false;
  return (ROLE_ACCESS[module]?.[role] ?? '-') === 'RW';
}
