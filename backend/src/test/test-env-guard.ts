/**
 * TEST-environment safety guard.
 *
 * Refuses to run destructive operations (wipe + seed + reset) unless the
 * process is unambiguously pointed at a Supabase TEST project (or an
 * explicitly allow-listed local Postgres host).
 *
 * Invariants enforced:
 *   1. `TEST_ENV=true` MUST be set in process.env.
 *   2. `DATABASE_URL` MUST be parseable as a postgres connection string.
 *   3. EITHER the hostname contains the substring "test"
 *      OR the hostname appears in `TEST_DB_HOST_ALLOWLIST` (comma-list).
 *   4. `NODE_ENV` MUST NOT be "production".
 *
 * The audit-doc reference is dependency-map.md §8 implication #1 and
 * missing-functionality-report.md gap G4 — production must never receive
 * a wipe call.
 */

export interface TestEnvAssertionResult {
  databaseUrl: string;
  host: string;
  allowedReason: 'host-contains-test' | 'host-allowlisted';
}

export class TestEnvironmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TestEnvironmentError';
  }
}

const PLACEHOLDER_FRAGMENTS = [
  '[YOUR-TEST-PASSWORD]',
  '[YOUR-TEST-PROJECT-REF]',
  '[YOUR-PROJECT-REF]',
  'YOUR-PASSWORD',
];

function parseHost(databaseUrl: string): string {
  try {
    return new URL(databaseUrl).hostname.toLowerCase();
  } catch {
    throw new TestEnvironmentError(
      `DATABASE_URL is not a valid URL. Received: "${databaseUrl}".`
    );
  }
}

function parseAllowlist(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Throw `TestEnvironmentError` if the current process is not safely
 * pointed at a TEST database. Returns a small descriptor on success
 * so callers can log which guard rail accepted the connection.
 */
export function assertTestEnvironment(
  env: NodeJS.ProcessEnv = process.env
): TestEnvAssertionResult {
  if (env.NODE_ENV === 'production') {
    throw new TestEnvironmentError(
      'NODE_ENV=production is set. Destructive test operations are forbidden in production.'
    );
  }

  if (env.TEST_ENV !== 'true') {
    throw new TestEnvironmentError(
      'TEST_ENV is not "true". Copy backend/.env.test.example to backend/.env.test and load it before running this script.'
    );
  }

  const databaseUrl = env.DATABASE_URL ?? '';
  if (!databaseUrl) {
    throw new TestEnvironmentError(
      'DATABASE_URL is empty. Refusing to run — TEST DB connection string must be provided via .env.test.'
    );
  }

  for (const placeholder of PLACEHOLDER_FRAGMENTS) {
    if (databaseUrl.includes(placeholder)) {
      throw new TestEnvironmentError(
        `DATABASE_URL still contains the placeholder "${placeholder}". Edit backend/.env.test with real TEST project credentials.`
      );
    }
  }

  const host = parseHost(databaseUrl);
  const allowlist = parseAllowlist(env.TEST_DB_HOST_ALLOWLIST);

  if (host.includes('test')) {
    return { databaseUrl, host, allowedReason: 'host-contains-test' };
  }

  if (allowlist.includes(host)) {
    return { databaseUrl, host, allowedReason: 'host-allowlisted' };
  }

  throw new TestEnvironmentError(
    `Refusing to run destructive operations against host "${host}". ` +
      `It does not contain the substring "test" and is not present in ` +
      `TEST_DB_HOST_ALLOWLIST (current allow-list: [${allowlist.join(', ') || 'empty'}]). ` +
      `Either point DATABASE_URL at a TEST Supabase project (hostname containing "test"), ` +
      `or add the hostname to TEST_DB_HOST_ALLOWLIST in backend/.env.test if it is a known-safe local DB.`
  );
}

/**
 * Convenience wrapper that prints the accepted guard and returns it.
 * Used by CLI scripts so the operator sees which rail let them through.
 */
export function assertTestEnvironmentWithLog(
  env: NodeJS.ProcessEnv = process.env
): TestEnvAssertionResult {
  const result = assertTestEnvironment(env);
  const reason =
    result.allowedReason === 'host-contains-test'
      ? `host "${result.host}" contains "test"`
      : `host "${result.host}" is on TEST_DB_HOST_ALLOWLIST`;
  console.log(`[test-env-guard] OK — ${reason}.`);
  return result;
}
