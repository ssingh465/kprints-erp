# KPrints ERP — End-to-End Test Workspace

This folder holds everything Playwright-driven and TEST-database-driven for KPrints ERP. It is split into two concerns:

1. **TEST database infrastructure** — reset script, deterministic `TEST_*` fixtures, and the production guard that refuses to wipe non-TEST databases.
2. **Playwright test surface** — page objects, factories, helpers, global setup/teardown, and the spec tree (added as work proceeds).

See [`docs/dependency-map.md`](docs/dependency-map.md), [`docs/workflow-map.md`](docs/workflow-map.md), [`docs/missing-functionality-report.md`](docs/missing-functionality-report.md), and [`docs/manual-test-matrix.md`](docs/manual-test-matrix.md) for the audit baseline and human QA checklist that justify every fixture and assertion choice.

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

## 3. QA role accounts

Eight dedicated personas cover every `AppRole` for RBAC specs. Emails follow `qa-<role>@<domain>` (default domain `example.com` from `QA_USER_DOMAIN` in `backend/.env.test`).

| Slug | Role | Email (default domain) |
|------|------|------------------------|
| `qa-super-admin` | SUPER_ADMIN | qa-super-admin@example.com |
| `qa-admin` | ADMIN | qa-admin@example.com |
| `qa-manager` | MANAGER | qa-manager@example.com |
| `qa-staff` | STAFF | qa-staff@example.com |
| `qa-designer` | DESIGNER | qa-designer@example.com |
| `qa-production` | PRODUCTION_OPERATOR | qa-production@example.com |
| `qa-finance` | FINANCE | qa-finance@example.com |
| `qa-viewer` | VIEWER | qa-viewer@example.com |

All personas share `QA_USER_PASSWORD` from `backend/.env.test`. Change the template placeholder before seeding — the seeder refuses `ChangeMe!QaTest123`.

### One-time setup (TEST project)

```bash
cp backend/.env.test.example backend/.env.test
# edit credentials + set a real QA_USER_PASSWORD

npm run db:push
npm run seed:qa-users
cd e2e && npm install && cd ..
npm run auth:setup
```

- [`backend/prisma/seed-qa-users.ts`](../backend/prisma/seed-qa-users.ts) — creates Supabase Auth users + upserts `app_users` (preserved across `test:reset`).
- [`e2e/scripts/generate-auth-states.ts`](scripts/generate-auth-states.ts) — writes Playwright storage states to `e2e/.auth/<slug>.json` (gitignored).
- [`e2e/fixtures/role-fixtures.ts`](fixtures/role-fixtures.ts) — `loginAs(page, 'qa-finance')`, `getQaAccessToken()`, and `qaAuthStatePath()` for `test.use({ storageState })`.

Persona definitions live in [`backend/src/test/qa-users.ts`](../backend/src/test/qa-users.ts) and are re-exported from [`e2e/fixtures/qa-users.ts`](fixtures/qa-users.ts).

---

## 4. Factories (ad-hoc test data)

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

## 5. Playwright global hooks

- [`global-setup.ts`](global-setup.ts) — loads `.env.test`, re-asserts the guard, shells out to `npm run test:reset --prefix backend`.
- [`global-teardown.ts`](global-teardown.ts) — no-op today; future hooks for upload cleanup + perf reports.

Wire them in [`playwright.config.ts`](playwright.config.ts):

```bash
npm run test:e2e              # from repo root — all Playwright specs
npm run test:e2e:workflows    # workflow suite only (Phase 5)
```

Workflow specs live under [`tests/workflows/`](tests/workflows/) and use [`fixtures/workflow-fixtures.ts`](fixtures/workflow-fixtures.ts) for API + DB triangulation.

---

## 6. Safety checklist before each run

- [ ] `backend/.env.test` exists and is gitignored.
- [ ] `DATABASE_URL` points at a **TEST** Supabase project (or local Postgres on the allowlist).
- [ ] `TEST_ENV=true` is set in `backend/.env.test`.
- [ ] You have run `npm run db:push` against the TEST project at least once (Prisma schema in sync).
- [ ] You have run `npm run seed:qa-users` at least once (QA personas in Supabase Auth + app_users).
- [ ] You are NOT running this against the production project. The guard will refuse, but read this checklist anyway.

The audit-doc reference for the safety rationale is [`docs/dependency-map.md`](docs/dependency-map.md) §8 and [`docs/missing-functionality-report.md`](docs/missing-functionality-report.md) gap G4 (demo-mode bypass).
