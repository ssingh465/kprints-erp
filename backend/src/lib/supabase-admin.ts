import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

/**
 * Service-role Supabase client for server-side auth operations:
 * - `auth.getUser(token)` to verify a Bearer JWT and resolve the auth user
 * - `auth.admin.inviteUserByEmail(...)` (Phase 3)
 *
 * NEVER expose the service role key to the frontend.
 */
let _client: SupabaseClient | null = null;

export function isSupabaseAdminConfigured(): boolean {
  return Boolean(config.supabaseUrl && config.supabaseServiceKey);
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!isSupabaseAdminConfigured()) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_KEY must be configured for server-side auth operations.'
    );
  }

  if (!_client) {
    _client = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return _client;
}

/** @deprecated Prefer getSupabaseAdmin() — lazy init with configuration guard */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getSupabaseAdmin(), prop, receiver);
  },
});
