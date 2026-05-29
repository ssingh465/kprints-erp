import type { AppRole } from '@prisma/client';
import type { Next } from 'hono';
import type { AuthContext } from '../middleware/auth.js';

export type AccessLevel = 'RW' | 'R' | '-';

/**
 * Static role-access matrix — single source of truth for backend RBAC.
 * Mirrors frontend `auth.constants.ts`.
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
  setup: { SUPER_ADMIN: 'RW', ADMIN: '-', MANAGER: '-', STAFF: '-', DESIGNER: '-', PRODUCTION_OPERATOR: '-', FINANCE: '-', VIEWER: '-' },
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

export function requireModuleAccess(module: string) {
  return async (c: AuthContext, next: Next): Promise<void | Response> => {
    if (c.get('isDemo')) return next();

    const appUser = c.get('appUser');
    if (!appUser) {
      return c.json(
        { success: false, error: 'Unauthorized', message: 'Authentication required.' },
        401
      );
    }

    if (!canAccessModule(appUser.role, module)) {
      return c.json(
        {
          success: false,
          error: 'Forbidden',
          message: `You do not have access to the ${module} module.`,
        },
        403
      );
    }

    return next();
  };
}

export function requireModuleWrite(module: string) {
  return async (c: AuthContext, next: Next): Promise<void | Response> => {
    if (c.get('isDemo')) return next();

    const appUser = c.get('appUser');
    if (!appUser) {
      return c.json(
        { success: false, error: 'Unauthorized', message: 'Authentication required.' },
        401
      );
    }

    if (!canWriteModule(appUser.role, module)) {
      return c.json(
        {
          success: false,
          error: 'Forbidden',
          message: `Write access to the ${module} module is not allowed for your role.`,
        },
        403
      );
    }

    return next();
  };
}
