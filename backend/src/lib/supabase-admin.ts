import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

/**
 * Service-role Supabase client for server-side auth operations:
 * - `auth.getUser(token)` to verify a Bearer JWT and resolve the auth user
 * - `auth.admin.inviteUserByEmail(...)` (Phase 3)
 *
 * NEVER expose the service role key to the frontend.
 */
if (!config.supabaseUrl || !config.supabaseServiceKey) {
  console.warn(
    'Warning: SUPABASE_URL or service role key not set — auth verification will fail until configured.'
  );
}

export const supabaseAdmin = createClient(
  config.supabaseUrl || 'https://placeholder.supabase.co',
  config.supabaseServiceKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
