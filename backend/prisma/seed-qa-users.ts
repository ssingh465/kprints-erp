/**
 * Provision eight QA RBAC personas in the Supabase TEST project.
 *
 * Usage (from repo root or backend/):
 *   npm run seed:qa-users
 *
 * Requires backend/.env.test with TEST_ENV=true, DATABASE_URL, Supabase TEST
 * keys, QA_USER_DOMAIN, and QA_USER_PASSWORD.
 *
 * Safety: refuses to run unless TEST_ENV=true and DATABASE_URL points at a
 * known-TEST host (see backend/src/test/test-env-guard.ts).
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';

function loadEnvFiles(): void {
  const candidates = [
    resolve(process.cwd(), 'backend', '.env.test.local'),
    resolve(process.cwd(), 'backend', '.env.test'),
    resolve(process.cwd(), '.env.test.local'),
    resolve(process.cwd(), '.env.test'),
    resolve(process.cwd(), 'backend', '.env'),
    resolve(process.cwd(), '.env'),
  ];

  const loaded: string[] = [];
  for (const path of candidates) {
    if (existsSync(path)) {
      dotenv.config({ path, override: false });
      loaded.push(path);
    }
  }

  if (loaded.length === 0) {
    console.warn('[seed-qa-users] No .env file found. Process env will be used as-is.');
  } else {
    console.log(`[seed-qa-users] Loaded env files:\n  - ${loaded.join('\n  - ')}`);
  }
}

function printHelp(): void {
  console.log(`Usage: npm run seed:qa-users

Creates or refreshes eight QA personas in Supabase Auth + app_users:
  qa-super-admin, qa-admin, qa-manager, qa-staff,
  qa-designer, qa-production, qa-finance, qa-viewer

Emails use QA_USER_DOMAIN (default example.com).
All personas share QA_USER_PASSWORD from backend/.env.test.

Requires:
  TEST_ENV=true
  DATABASE_URL → Supabase TEST project
  SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY → same TEST project
  QA_USER_PASSWORD → real TEST-only password (not the template placeholder)

After seeding, generate Playwright storage states:
  npm run auth:setup`);
}

async function main(): Promise<void> {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printHelp();
    return;
  }

  loadEnvFiles();

  const { assertTestEnvironmentWithLog } = await import(
    '../src/test/test-env-guard.js'
  );
  assertTestEnvironmentWithLog(process.env);

  const { seedQaUsers } = await import('../src/test/qa-user-seeder.js');
  const results = await seedQaUsers();

  console.log('[seed-qa-users] ✓ QA personas provisioned:');
  for (const result of results) {
    const authAction = result.createdAuthUser ? 'created' : 'updated';
    const appAction = result.createdAppUser ? 'created' : 'updated';
    console.log(
      `  - ${result.persona.slug.padEnd(18)} ${result.persona.role.padEnd(20)} ${result.persona.email} (auth ${authAction}, app_users ${appAction})`
    );
  }
}

main().catch((error) => {
  if (error?.name === 'TestEnvironmentError') {
    console.error(`[seed-qa-users] ✗ Guard rejected: ${error.message}`);
  } else {
    console.error('[seed-qa-users] ✗ Failed:', error);
  }
  process.exit(1);
});
