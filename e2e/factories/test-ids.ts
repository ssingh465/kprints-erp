/**
 * Re-export of the canonical TEST_* IDs that the backend test-seeder
 * writes into the TEST database. Imported by Playwright specs so the
 * frontend tests and the backend seeder share a single source of truth.
 *
 * Owned by backend/src/test/test-ids.ts — do NOT redefine values here.
 */

export * from '../../backend/src/test/test-ids.js';
