/**
 * Playwright role fixtures — authenticate as any QA persona.
 *
 * Prerequisites:
 *   1. npm run seed:qa-users   (Supabase Auth + app_users in TEST project)
 *   2. npm run auth:setup      (optional — writes e2e/.auth/<slug>.json for test.use)
 *
 * Usage in specs (once @playwright/test is wired):
 *
 *   import { test, expect, loginAs, qaAuthStatePath } from '../fixtures/role-fixtures';
 *
 *   test('finance can open finance module', async ({ page }) => {
 *     await loginAs(page, 'qa-finance');
 *     await page.goto('/finance');
 *     await expect(page.getByRole('heading', { name: /finance/i })).toBeVisible();
 *   });
 *
 *   test.describe('as qa-viewer', () => {
 *     test.use({ storageState: qaAuthStatePath('qa-viewer') });
 *     test('read-only nav', async ({ page }) => { ... });
 *   });
 */

import { readFileSync, existsSync } from 'node:fs';
import { test as base, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import {
  getQaPersonaBySlug,
  resolveQaPersonas,
  type QaPersonaSlug,
} from './qa-users.js';
import { buildSupabaseStorageState } from './auth-storage.js';
import { qaAuthStatePath } from './auth-paths.js';

export { expect, qaAuthStatePath };
export type { QaPersonaSlug };
export * from './qa-users.js';
export const test = base;

function requireEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required env var ${key}. Load backend/.env.test first.`);
  }
  return value;
}

function resolvePersonaEmail(slug: QaPersonaSlug): string {
  const resolved = resolveQaPersonas(process.env).find((entry) => entry.slug === slug);
  if (resolved) {
    return resolved.email;
  }
  const persona = getQaPersonaBySlug(slug);
  const domain = process.env.QA_USER_DOMAIN?.trim() || 'example.com';
  return `${persona.emailLocal}@${domain}`;
}

async function applyLocalStorageEntries(
  page: Page,
  origin: string,
  entries: Array<{ name: string; value: string }>
): Promise<void> {
  await page.goto(origin);
  await page.evaluate((items) => {
    localStorage.clear();
    sessionStorage.clear();
    for (const item of items) {
      localStorage.setItem(item.name, item.value);
    }
  }, entries);
  await page.reload();
}

async function signInViaSupabase(page: Page, slug: QaPersonaSlug): Promise<void> {
  const email = resolvePersonaEmail(slug);
  const password = requireEnv('QA_USER_PASSWORD');
  const baseUrl = process.env.E2E_BASE_URL?.trim() || 'http://localhost:4200';
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const supabaseAnonKey = requireEnv('SUPABASE_ANON_KEY');

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(
      `Supabase sign-in failed for ${email}: ${error?.message ?? 'missing session'}. ` +
        'Run npm run seed:qa-users against the TEST project first.'
    );
  }

  const storage = buildSupabaseStorageState(data.session, { baseUrl, supabaseUrl });
  const origin = storage.origins[0]?.origin ?? new URL(baseUrl).origin;
  const entries = storage.origins[0]?.localStorage ?? [];
  await applyLocalStorageEntries(page, origin, entries);
}

async function loginViaUi(page: Page, slug: QaPersonaSlug): Promise<void> {
  const email = resolvePersonaEmail(slug);
  const password = requireEnv('QA_USER_PASSWORD');
  const baseUrl = process.env.E2E_BASE_URL?.trim() || 'http://localhost:4200';

  await page.goto(`${baseUrl}/auth/login`);
  await page.locator('#email').fill(email);
  await page.locator('#password input').fill(password);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/auth/login'), {
    timeout: 30_000,
  });
}

/**
 * Authenticate `page` as the given QA persona.
 *
 * Uses a pre-generated storage state file when present (`npm run auth:setup`),
 * otherwise signs in via Supabase and injects the session into localStorage.
 * Pass `{ forceUi: true }` to exercise the login form directly.
 */
export async function loginAs(
  page: Page,
  slug: QaPersonaSlug,
  options?: { forceUi?: boolean }
): Promise<void> {
  if (options?.forceUi) {
    await loginViaUi(page, slug);
    return;
  }

  const statePath = qaAuthStatePath(slug);
  if (existsSync(statePath)) {
    const state = JSON.parse(readFileSync(statePath, 'utf8')) as {
      origins: Array<{ origin: string; localStorage: Array<{ name: string; value: string }> }>;
    };
    const baseUrl = process.env.E2E_BASE_URL?.trim() || 'http://localhost:4200';
    const origin = state.origins[0]?.origin ?? new URL(baseUrl).origin;
    const entries = state.origins[0]?.localStorage ?? [];
    await applyLocalStorageEntries(page, origin, entries);
    return;
  }

  await signInViaSupabase(page, slug);
}

/**
 * Return a Supabase access token for API-level RBAC specs.
 */
export async function getQaAccessToken(slug: QaPersonaSlug): Promise<string> {
  const email = resolvePersonaEmail(slug);
  const password = requireEnv('QA_USER_PASSWORD');
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const supabaseAnonKey = requireEnv('SUPABASE_ANON_KEY');

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) {
    throw new Error(
      `Supabase sign-in failed for ${email}: ${error?.message ?? 'missing access token'}`
    );
  }
  return data.session.access_token;
}
