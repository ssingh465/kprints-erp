import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

if (!config.supabaseUrl) {
  console.warn('Warning: SUPABASE_URL is not set in environment variables.');
}

export const supabase = createClient(
  config.supabaseUrl || 'https://placeholder.supabase.co',
  config.supabaseServiceKey || config.supabaseAnonKey || 'placeholder-key'
);
