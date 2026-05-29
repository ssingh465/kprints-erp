import type { MiddlewareHandler, Next } from 'hono';
import {
  optionalAuth,
  requireAuthOrDemo,
  requireApprovedUnlessDemo,
  type AuthContext,
} from './auth.js';
import { requireModuleAccess, requireModuleWrite } from '../auth/role-access.js';

/**
 * Standard ERP route protection: demo bypass OR authenticated + approved + module read access.
 */
export function protect(module: string): MiddlewareHandler[] {
  return [optionalAuth, requireAuthOrDemo, requireApprovedUnlessDemo, requireModuleAccess(module)];
}

/** Enforce write access on mutating handlers (POST/PUT/PATCH/DELETE). */
export function requireWrite(module: string): MiddlewareHandler {
  return requireModuleWrite(module);
}

/**
 * Setup mutations: demo header OR authenticated SUPER_ADMIN.
 */
export function protectSetupMutation(): MiddlewareHandler[] {
  return [optionalAuth, requireDemoOrSuperAdmin];
}

async function requireDemoOrSuperAdmin(c: AuthContext, next: Next): Promise<void | Response> {
  if (c.get('isDemo')) return next();

  const appUser = c.get('appUser');
  if (!appUser) {
    return c.json(
      { success: false, error: 'Unauthorized', message: 'Authentication required.' },
      401
    );
  }

  if (!appUser.isActive) {
    return c.json(
      { success: false, error: 'AccountDisabled', message: 'This account has been disabled.' },
      403
    );
  }

  if (!appUser.isApproved) {
    return c.json(
      { success: false, error: 'PendingApproval', message: 'Your account is awaiting approval.' },
      403
    );
  }

  if (appUser.role !== 'SUPER_ADMIN') {
    return c.json(
      {
        success: false,
        error: 'Forbidden',
        message: 'Only a Super Admin can perform this setup action.',
      },
      403
    );
  }

  return next();
}
