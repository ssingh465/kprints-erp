/**
 * Build Playwright-compatible storage state payloads for Supabase-authenticated
 * Angular sessions without driving the login UI.
 */

import type { Session } from '@supabase/supabase-js';

/** Matches AuthStorageService prefix + AUTH_STORAGE_KEYS.rememberMe. */
export const QA_REMEMBER_ME_STORAGE_KEY = 'kprints-erp:auth.remember-me';

export function extractSupabaseProjectRef(supabaseUrl: string): string {
  const hostname = new URL(supabaseUrl).hostname.toLowerCase();
  const [ref] = hostname.split('.');
  if (!ref) {
    throw new Error(`Could not parse Supabase project ref from "${supabaseUrl}".`);
  }
  return ref;
}

export function supabaseAuthStorageKey(supabaseUrl: string): string {
  return `sb-${extractSupabaseProjectRef(supabaseUrl)}-auth-token`;
}

export interface PlaywrightStorageState {
  cookies: [];
  origins: Array<{
    origin: string;
    localStorage: Array<{ name: string; value: string }>;
  }>;
}

/**
 * Serialize a Supabase session into the localStorage shape the Angular app
 * expects when Remember me is enabled.
 */
export function buildSupabaseStorageState(
  session: Session,
  options: { baseUrl: string; supabaseUrl: string }
): PlaywrightStorageState {
  const origin = new URL(options.baseUrl).origin;
  const authKey = supabaseAuthStorageKey(options.supabaseUrl);

  return {
    cookies: [],
    origins: [
      {
        origin,
        localStorage: [
          { name: QA_REMEMBER_ME_STORAGE_KEY, value: 'true' },
          {
            name: authKey,
            value: JSON.stringify({
              access_token: session.access_token,
              token_type: session.token_type,
              expires_in: session.expires_in,
              expires_at: session.expires_at,
              refresh_token: session.refresh_token,
              user: session.user,
            }),
          },
        ],
      },
    ],
  };
}
