# KPrints ERP — End-to-End Test Workspace

This folder holds everything Playwright-driven and TEST-database-driven for KPrints ERP. It is split into two concerns:

1. **TEST database infrastructure** — reset script, deterministic `TEST_*` fixtures, and the production guard that refuses to wipe non-TEST databases.
2. **Playwright test surface** — page objects, factories, helpers, global setup/teardown, and the spec tree (added as work proceeds).

See [`docs/dependency-map.md`](docs/dependency-map.md), [`docs/workflow-map.md`](docs/workflow-map.md), and [`docs/missing-functionality-report.md`](docs/missing-functionality-report.md) for the audit baseline that justifies every fixture and assertion choice.

---

## 1. Prerequisites

### A dedicated Supabase TEST project

The reset script intentionally refuses to run unless `DATABASE_URL` points at a hostname that either:

- contains the substring `test` (e.g. `db.kprints-test.supabase.co`), **or**
- is on the comma-separated `TEST_DB_HOST_ALLOWLIST` env (typically `localhost,127.0.0.1` for local Postgres).

Create a separate Supabase project for QA (free tier is fine) — never reuse the production project for TEST.

### Backend env file

```bash
cp backend/.env.test.example backend/.env.test
# then edit backend/.env.test with the TEST project credentials
```

The file is gitignored (see [`.gitignore`](../.gitignore) entries for `/backend/.env.test*`).

### Prisma schema applied to TEST DB

Once the env file is populated, push the schema to the TEST project:

```bash
DATABASE_URL="<TEST connection string>" npm run db:push
```

(You can also run `npm run db:push --prefix backend` from the repo root after `source`-ing the env file.)

---

## 2. Reset + seed the TEST database

From repo root:

```bash
npm run test:reset                  # wipes transactional tables, seeds TEST_* fixtures
npm run test:reset:keep-audit       # same, but preserves audit_logs (debugging)
```

What the script does (see [`backend/src/test/test-seeder.ts`](../backend/src/test/test-seeder.ts)):

1. Loads env from `backend/.env.test{,.local}` → `.env.test{,.local}` → `backend/.env` → `.env` (first found wins).
2. Calls `assertTestEnvironment()` ([`backend/src/test/test-env-guard.ts`](../backend/src/test/test-env-guard.ts)) — refuses to proceed unless:
   - `NODE_ENV !== 'production'`
   - `TEST_ENV === 'true'`
   - `DATABASE_URL` is a valid URL with **no placeholder fragments** (e.g. `[YOUR-TEST-PROJECT-REF]`)
   - Hostname contains `test` **or** is on `TEST_DB_HOST_ALLOWLIST`.
3. Wipes every transactional Prisma table (orders, production_jobs, shipments, expenses, posters, suppliers, inventory, coupons, partners, settings, dashboard_snapshots, artwork_uploads, invoices, audit_logs).
4. **Preserves** `app_users` and `user_invitations` so QA personas survive (provisioned separately by the QA-user seeder).
5. Inserts the deterministic [`TEST_* fixture snapshot`](../backend/src/test/test-seed-data.ts).

Counters (`customer.orderCount`, `customer.lifetimeValue`) are reconciled from the seeded orders so the fixture is self-consistent.

### Snapshot contents

| Entity         | Count | Notes |
|----------------|------:|-------|
| Customers      | 4 | Alpha / Beta / Gamma / VIP — VIP holds the two production-pipeline orders |
| Posters        | 4 | in-stock, out-of-stock, low-stock, personalized |
| Suppliers      | 3 | regular, no-balance, overdue |
| Inventory      | 4 | healthy, low, alert-threshold, frames |
| Orders         | 6 | covers every key status (Draft → Cancelled) |
| Production jobs| 3 | one per non-Draft/non-Cancelled order |
| Shipments      | 2 | Packed + Delivered |
| Expenses       | 2 | supplier-linked + standalone |
| Coupons        | 2 | active + inactive (orphaned per gap G6) |
| Partners       | 2 | 60/40 split with seed investments |

The canonical IDs are exported from [`backend/src/test/test-ids.ts`](../backend/src/test/test-ids.ts) and re-exported from [`e2e/factories/test-ids.ts`](factories/test-ids.ts) so Playwright tests and backend scripts share one source of truth.

---

## 3. Factories (ad-hoc test data)

Use canonical TEST_* IDs when a stable id matters. Use the factories in [`e2e/factories/`](factories/) when a test needs throwaway data (duplicate-email validation, pagination edge cases, etc.).

```ts
import { ApiClient, createCustomer, createOrder, TEST_POSTER_001 } from './factories';

const api = new ApiClient({ accessToken: someJwt });
const customer = await createCustomer(api, { city: 'Pune' });
const order = await createOrder(api, {
  customerId: customer.id,
  lines: [{ posterId: TEST_POSTER_001, description: 'TEST', size: '18 x 24 in', quantity: 1, unitPrice: 500 }],
});
```

Factories are deliberately dependency-free (native `fetch`) so they run from both Playwright fixtures and the standalone `globalSetup`.

---

## 4. Playwright global hooks

- [`global-setup.ts`](global-setup.ts) — loads `.env.test`, re-asserts the guard, shells out to `npm run test:reset --prefix backend`.
- [`global-teardown.ts`](global-teardown.ts) — no-op today; future hooks for upload cleanup + perf reports.

Wire them in the (forthcoming) `playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  globalSetup: require.resolve('./global-setup'),
  globalTeardown: require.resolve('./global-teardown'),
  // ... projects, baseURL, etc.
});
```

Playwright itself is **not** installed yet — it lands in the cross-cutting `playwright-scaffold` task. The skeleton files above will Just Work once `@playwright/test` is added under `e2e/`.

---

## 5. Safety checklist before each run

- [ ] `backend/.env.test` exists and is gitignored.
- [ ] `DATABASE_URL` points at a **TEST** Supabase project (or local Postgres on the allowlist).
- [ ] `TEST_ENV=true` is set in `backend/.env.test`.
- [ ] You have run `npm run db:push` against the TEST project at least once (Prisma schema in sync).
- [ ] You are NOT running this against the production project. The guard will refuse, but read this checklist anyway.

The audit-doc reference for the safety rationale is [`docs/dependency-map.md`](docs/dependency-map.md) §8 and [`docs/missing-functionality-report.md`](docs/missing-functionality-report.md) gap G4 (demo-mode bypass).
