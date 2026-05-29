import type { AppUser } from '@prisma/client';

/**
 * Minimal identity resolved from a verified Supabase JWT.
 */
export interface AuthUser {
  id: string;
  email: string;
}

/**
 * ERP profile (app_users row) attached to the request context once resolved.
 */
export type AppUserContext = AppUser;

/**
 * Hono context variables set by the auth middleware.
 *
 * Usage: `new Hono<{ Variables: AuthVariables }>()`
 */
export interface AuthVariables {
  authUser?: AuthUser;
  appUser?: AppUserContext;
  isDemo?: boolean;
}
