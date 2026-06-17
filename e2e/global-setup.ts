/**
 * Playwright globalSetup — runs ONCE before any spec in a Playwright
 * test run. Responsibilities:
 *
 *   1. Load `.env.test` (preferred) so all child processes see TEST DB
 *      credentials without leaking to the dev environment.
 *   2. Re-assert the TEST-environment guard (defence in depth — the
 *      reset shell-out also asserts it).
 *   3. Reset the TEST database via `npm run test:reset --prefix backend`,
 *      shell-executed so we don't drag @prisma/client into the e2e/
 *      package tree.
 *
 * Playwright is wired in `playwright.config.ts` via:
 *   globalSetup: require.resolve('./global-setup'),
 *
 * Playwright is configured in `playwright.config.ts` with globalSetup
 * wired to reset the TEST database before each run.
 */

import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');

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
      console.log(`[e2e/global-setup] loaded env: ${path}`);
    }
  }
}

async function runShell(command: string, args: string[]): Promise<void> {
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: REPO_ROOT,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: { ...process.env },
    });
    child.on('error', rejectPromise);
    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        rejectPromise(
          new Error(`Command "${command} ${args.join(' ')}" exited with code ${code}`)
        );
      }
    });
  });
}

async function globalSetup(): Promise<void> {
  console.log('[e2e/global-setup] starting...');
  loadEnvFiles();

  // Defence in depth: assert guard before we shell out.
  const { assertTestEnvironmentWithLog } = await import(
    '../backend/src/test/test-env-guard.js'
  );
  assertTestEnvironmentWithLog(process.env);

  console.log('[e2e/global-setup] resetting TEST database...');
  await runShell('npm', ['run', 'test:reset', '--prefix', 'backend']);
  console.log('[e2e/global-setup] ✓ TEST DB ready.');
}

export default globalSetup;
