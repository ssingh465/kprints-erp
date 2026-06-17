import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../..');

/**
 * Load TEST env files (same precedence as global-setup / backend test-reset).
 * Safe to call multiple times — later files do not override earlier keys.
 */
export function loadTestEnv(): void {
  const candidates = [
    resolve(REPO_ROOT, 'backend', '.env.test.local'),
    resolve(REPO_ROOT, 'backend', '.env.test'),
    resolve(REPO_ROOT, '.env.test.local'),
    resolve(REPO_ROOT, '.env.test'),
  ];

  for (const path of candidates) {
    if (existsSync(path)) {
      dotenv.config({ path, override: false });
    }
  }
}
