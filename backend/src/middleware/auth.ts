import type { AppRole } from '@prisma/client';
import type { Context, Next } from 'hono';
import { supabaseAdmin } from '../lib/supabase-admin.js';
import { config } from '../config/index.js';
import { prisma } from '../lib/prisma.js';
import type { AuthVariables } from '../types/auth.js';

export type AuthContext = Context<{ Variables: AuthVariables }>;

const DEMO_HEADER = 'x-app-mode';
const DEMO_VALUE = 'demo';

function extractBearer(c: Context): string | null {
  const header = c.req.header('authorization') || c.req.header('Authorization');
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
}

/**
 * Verify a Supabase JWT and load the matching app_users profile.
 * Returns null if the token is missing/invalid.
 */
async function resolveUser(c: AuthContext): Promise<boolean> {
  const token = extractBearer(c);
  if (!token) return false;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return false;

  c.set('authUser', { id: data.user.id, email: data.user.email ?? '' });

  const appUser = await prisma.appUser.findUnique({ where: { id: data.user.id } });
  if (appUser) {
    c.set('appUser', appUser);
  }
  return true;
}

function isDemoRequest(c: Context): boolean {
  const mode = c.req.header(DEMO_HEADER) || c.req.header('X-App-Mode');
  return mode?.toLowerCase() === DEMO_VALUE;
}

/**
 * Attaches auth context if a valid token is present, otherwise continues.
 * Also flags demo requests (validated against Settings.demoMode).
 * Does NOT block — downstream middleware decides.
 */
export async function optionalAuth(c: AuthContext, next: Next): Promise<void | Response> {
  if (isDemoRequest(c) && config.nodeEnv !== 'production') {
    const settings = await prisma.settings.findFirst();
    if (settings?.demoMode) {
      c.set('isDemo', true);
      return next();
    }
  }

  await resolveUser(c);
  return next();
}

/**
 * Requires a valid Supabase JWT AND an existing app_users row.
 */
export async function requireAuth(c: AuthContext, next: Next): Promise<void | Response> {
  const ok = await resolveUser(c);
  if (!ok || !c.get('authUser')) {
    return c.json(
      { success: false, error: 'Unauthorized', message: 'Authentication required.' },
      401
    );
  }

  if (!c.get('appUser')) {
    return c.json(
      {
        success: false,
        error: 'ProfileMissing',
        message: 'No ERP profile found for this account. Complete profile sync first.',
      },
      403
    );
  }

  return next();
}

/**
 * Requires the resolved app user to be approved and active.
 * (Primary use begins in Phase 2; included here for completeness.)
 */
export async function requireApprovedUser(c: AuthContext, next: Next): Promise<void | Response> {
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

  return next();
}

/**
 * Requires either demo mode (flagged by optionalAuth) or a valid authenticated profile.
 */
export async function requireAuthOrDemo(c: AuthContext, next: Next): Promise<void | Response> {
  if (c.get('isDemo') && config.nodeEnv !== 'production') return next();

  if (!c.get('authUser') || !c.get('appUser')) {
    return c.json(
      { success: false, error: 'Unauthorized', message: 'Authentication required.' },
      401
    );
  }

  return next();
}

/**
 * Skips approval checks in demo mode; otherwise enforces approved + active.
 */
export async function requireApprovedUnlessDemo(
  c: AuthContext,
  next: Next
): Promise<void | Response> {
  if (c.get('isDemo') && config.nodeEnv !== 'production') return next();
  return requireApprovedUser(c, next);
}

/**
 * Restricts access to one or more explicit roles (authenticated users only).
 */
export function requireRole(...roles: AppRole[]) {
  return async (c: AuthContext, next: Next): Promise<void | Response> => {
    if (c.get('isDemo') && config.nodeEnv !== 'production') return next();

    const appUser = c.get('appUser');
    if (!appUser) {
      return c.json(
        { success: false, error: 'Unauthorized', message: 'Authentication required.' },
        401
      );
    }

    if (!roles.includes(appUser.role)) {
      return c.json(
        {
          success: false,
          error: 'Forbidden',
          message: 'Your role does not have permission for this action.',
        },
        403
      );
    }

    return next();
  };
}
