/**
 * Generate Playwright storage-state JSON files for every QA persona.
 *
 * Run after `npm run seed:qa-users` once backend/.env.test is populated:
 *   npm run auth:setup
 *
 * Output: e2e/.auth/<slug>.json (gitignored)
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { QA_PERSONA_SLUGS, resolveQaPersonas } from '../fixtures/qa-users.js';
import { buildSupabaseStorageState } from '../fixtures/auth-storage.js';
import { QA_AUTH_STATE_DIR, qaAuthStatePath } from '../fixtures/auth-paths.js';

export { QA_AUTH_STATE_DIR, qaAuthStatePath };

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');

function loadEnvFiles(): void {
  const candidates = [
    resolve(REPO_ROOT, 'backend', '.env.test.local'),
    resolve(REPO_ROOT, 'backend', '.env.test'),
    resolve(REPO_ROOT, '.env.test.local'),
    resolve(REPO_ROOT, '.env.test'),
  ];

  for (const path of candidates) {
    if (existsSync(path)) {
      dotenv.config({ path, override: false });
      console.log(`[auth:setup] loaded env: ${path}`);
    }
  }
}

function requireEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required env var ${key}. Populate backend/.env.test first.`);
  }
  return value;
}

export async function generateQaAuthStates(options?: {
  force?: boolean;
}): Promise<string[]> {
  loadEnvFiles();

  const supabaseUrl = requireEnv('SUPABASE_URL');
  const supabaseAnonKey = requireEnv('SUPABASE_ANON_KEY');
  const password = requireEnv('QA_USER_PASSWORD');
  const baseUrl = process.env.E2E_BASE_URL?.trim() || 'http://localhost:4200';

  mkdirSync(QA_AUTH_STATE_DIR, { recursive: true });

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const personas = resolveQaPersonas(process.env);
  const written: string[] = [];

  for (const persona of personas) {
    const outputPath = qaAuthStatePath(persona.slug);
    if (!options?.force && existsSync(outputPath)) {
      console.log(`[auth:setup] skip ${persona.slug} — ${outputPath} already exists`);
      written.push(outputPath);
      continue;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: persona.email,
      password,
    });

    if (error || !data.session) {
      throw new Error(
        `Sign-in failed for ${persona.email}: ${error?.message ?? 'missing session'}. ` +
          'Run npm run seed:qa-users against the TEST project first.'
      );
    }

    const storageState = buildSupabaseStorageState(data.session, {
      baseUrl,
      supabaseUrl,
    });

    writeFileSync(outputPath, `${JSON.stringify(storageState, null, 2)}\n`, 'utf8');
    console.log(`[auth:setup] wrote ${persona.slug} → ${outputPath}`);
    written.push(outputPath);

    await supabase.auth.signOut();
  }

  return written;
}

async function main(): Promise<void> {
  const force = process.argv.includes('--force');
  const paths = await generateQaAuthStates({ force });
  console.log(
    `[auth:setup] ✓ ${paths.length} storage state(s) ready for slugs: ${QA_PERSONA_SLUGS.join(', ')}`
  );
}

main().catch((error) => {
  console.error('[auth:setup] ✗ Failed:', error);
  process.exit(1);
});
