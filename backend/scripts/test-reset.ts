/**
 * Operator CLI: wipe the TEST database and re-seed deterministic TEST_*
 * fixtures. Loads `.env.test` (preferred) or `.env` from `backend/`.
 *
 * Usage (from repo root or backend/):
 *   npm run test:reset                  # uses backend/.env.test
 *   npm run test:reset -- --keep-audit  # preserves audit_logs
 *   npm run test:reset -- --anchor 2026-06-15T00:00:00Z
 *
 * Safety: refuses to run unless TEST_ENV=true and DATABASE_URL points
 * at a known-TEST host (see backend/src/test/test-env-guard.ts).
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';

function loadEnvFiles(): void {
  // Priority: .env.test (preferred) → .env.test.local → .env
  // The CWD when run via `npm run --prefix backend` is repo root.
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
    console.warn(
      '[test-reset] No .env file found. Process env will be used as-is.'
    );
  } else {
    console.log(`[test-reset] Loaded env files (first wins):\n  - ${loaded.join('\n  - ')}`);
  }
}

interface CliFlags {
  preserveAuditLogs: boolean;
  anchor?: Date;
}

function parseFlags(argv: readonly string[]): CliFlags {
  const flags: CliFlags = { preserveAuditLogs: false };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--keep-audit' || arg === '--preserve-audit') {
      flags.preserveAuditLogs = true;
      continue;
    }
    if (arg === '--anchor') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('--anchor requires an ISO date string argument.');
      }
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        throw new Error(`--anchor received invalid date: "${value}".`);
      }
      flags.anchor = date;
      i += 1;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    console.warn(`[test-reset] Unknown flag ignored: "${arg}"`);
  }

  return flags;
}

function printHelp(): void {
  console.log(`Usage: npm run test:reset                       (wipes audit_logs)
       npm run test:reset:keep-audit            (preserves audit_logs)
       npm run test:reset -- --anchor <ISO>     (pin seed date)

Flags (when invoked directly via tsx):
  --keep-audit         Preserve existing audit_logs rows (default wipes).
  --anchor <ISO>       Pin seed date for deterministic test output.
  -h, --help           Show this message.

Loads environment from (first found wins):
  backend/.env.test.local
  backend/.env.test
  ./.env.test.local
  ./.env.test
  backend/.env
  ./.env

Requires:
  TEST_ENV=true
  DATABASE_URL → Supabase TEST project (host contains "test")
                OR host present in TEST_DB_HOST_ALLOWLIST.`);
}

async function main(): Promise<void> {
  loadEnvFiles();
  const flags = parseFlags(process.argv.slice(2));

  // Dynamic import so dotenv runs before Prisma reads env.
  const { resetAndSeedTestDatabase } = await import(
    '../src/test/test-seeder.js'
  );

  const result = await resetAndSeedTestDatabase({
    anchor: flags.anchor,
    preserveAuditLogs: flags.preserveAuditLogs,
  });

  const counts = {
    customers: result.snapshot.customers.length,
    posters: result.snapshot.posters.length,
    suppliers: result.snapshot.suppliers.length,
    inventory: result.snapshot.inventory.length,
    orders: result.snapshot.orders.length,
    productionJobs: result.snapshot.productionJobs.length,
    shipments: result.snapshot.shipments.length,
    expenses: result.snapshot.expenses.length,
    coupons: result.snapshot.coupons.length,
    partners: result.snapshot.partners.length,
  };

  console.log('[test-reset] ✓ TEST database reset and seeded.');
  console.log('[test-reset] Snapshot counts:', counts);
  console.log(
    `[test-reset] Duration: ${result.durationMs}ms · Anchor: ${result.anchor.toISOString()}`
  );
}

main().catch((error) => {
  if (error?.name === 'TestEnvironmentError') {
    console.error(`[test-reset] ✗ Guard rejected: ${error.message}`);
  } else {
    console.error('[test-reset] ✗ Failed:', error);
  }
  process.exit(1);
});
