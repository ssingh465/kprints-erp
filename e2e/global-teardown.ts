/**
 * Playwright globalTeardown — runs ONCE after the full Playwright test
 * run completes. Intentionally minimal today.
 *
 * Why we do NOT wipe the DB here:
 *   - Leaving the seeded TEST_* set in place lets a developer inspect
 *     post-run state locally (`prisma studio`) for debugging.
 *   - The next run's globalSetup wipes again, so we don't leak data.
 *
 * Hooks to add later as suites land (not wired yet):
 *   - Upload tests: purge orphaned Supabase Storage objects.
 *   - Performance tests: flush metrics to a report file.
 */

async function globalTeardown(): Promise<void> {
  console.log('[e2e/global-teardown] no-op (seeded TEST data preserved for inspection).');
}

export default globalTeardown;
