/**
 * Public surface of the e2e factory layer.
 *
 * Conventions:
 *   - Canonical TEST_* IDs live in `test-ids.ts` (re-exported from
 *     backend/src/test/test-ids.ts — single source of truth).
 *   - Each entity has both `<entity>Input()` (returns a payload) and
 *     `create<Entity>()` (POSTs and returns the record).
 *   - Factories accept a shared `ApiClient` so a Playwright fixture
 *     can inject auth + base URL once.
 *   - Higher-level "compose a workflow" helpers go in
 *     `e2e/helpers/workflow.ts` once cross-module workflow specs land.
 */

export * from './test-ids.js';
export * from './api-client.js';
export * from './customer-factory.js';
export * from './poster-factory.js';
export * from './supplier-factory.js';
export * from './inventory-factory.js';
export * from './order-factory.js';
export * from './production-factory.js';
export * from './expense-factory.js';
