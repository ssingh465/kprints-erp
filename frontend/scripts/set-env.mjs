/**
 * Generates production environment.ts from Vercel/build environment variables.
 * Run before `ng build` on Vercel so Supabase keys are baked into the bundle.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const target = join(__dirname, '../src/environments/environment.ts');

const apiBaseUrl = process.env.API_BASE_URL ?? '/api';
const supabaseUrl = process.env.SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? '';
const googleOAuthEnabled = process.env.GOOGLE_OAUTH_ENABLED === 'true';

const contents = `export const environment = {
  production: true,
  apiBaseUrl: '${apiBaseUrl}',
  supabaseUrl: '${supabaseUrl}',
  supabaseAnonKey: '${supabaseAnonKey}',
  authRedirectUrl: '/auth/callback',
  googleOAuthEnabled: ${googleOAuthEnabled},
};
`;

writeFileSync(target, contents, 'utf8');
console.log(`Wrote ${target}`);
