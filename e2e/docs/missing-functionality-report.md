# KPrints ERP — Missing Functionality Report (Phase 1)

> **Phase 1 — Discovery Audit.** Initial catalogue of integration gaps, broken contracts, and quality risks found while building [`dependency-map.md`](dependency-map.md) and [`workflow-map.md`](workflow-map.md). This is **not** a complete production-readiness audit (that lands in Phase 16); it is the working backlog that Phases 5–15 will close (fix) or escalate (document + recommend).
>
> **Severity legend** — used throughout:
>
> - **P0 / Blocker** — corrupts data, breaks production safety, or makes a critical business workflow impossible.
> - **P1 / Major** — feature claimed by UI or schema but absent in service code; visible UX gap.
> - **P2 / Minor** — quality, observability, or polish; safe to defer.
> - **P3 / Nit** — code hygiene, naming, copy.

---

## 1. Top-line summary

| Severity | Count | Examples |
|---|---|---|
| P0 | 4 | inventory-on-order missing, order-no race, customer counter not reversed on delete, demo mode bypasses RBAC |
| P1 | 8 | invoice API absent, coupons orphaned, production/shipment audit gap, status drift bugs, expense supplier rollback gap, no expense UPDATE endpoint, purchases module not a real domain, artwork delete missing |
| P2 | 9 | toast feedback inconsistent, no CSV/PDF beyond 4 modules, no `PosterCategory` UI, no rate limiting visible, no idempotency keys, no PaginatedExport, demo seed not idempotent, no AR/AP module, no `lib/prisma` connection-pool sanity check |
| P3 | 6 | "Operator Unassigned" sentinel string, `'Delhivery'`/`'Delhi'` hardcoded, raw `any` in services, magic numbers for orderNo/jobNo bases, status enum duplicated in 3 places, no OpenAPI for most routes |

Total: **27 documented findings** (this list will grow as Phase 5+ exercises the system).

---

## 2. P0 — Blockers

### G1. Order → Inventory linkage is **completely absent**

- **Where:** [`backend/src/modules/orders/orders.service.ts`](../../backend/src/modules/orders/orders.service.ts) — zero references to `inventory*` or `poster.stock`.
- **What is missing:**
  - `Poster.stock` is **not decremented** when an order is created or completed.
  - No `InventoryMovement` of type `Consumption` is recorded when an order consumes raw materials (paper, ink, frames, lamination).
  - `Poster.soldThisMonth` is derived on read by [`utils/poster-sales.ts`](../../backend/src/utils/poster-sales.ts) (read-only aggregation), so the column itself drifts; create/update never writes to it.
- **Business impact:** stock counts and reorder alerts (`DashboardService.getMetrics → lowStockItems`) cannot be trusted. Reorder decisions made on incorrect data.
- **Suggested fix (Phase 5 critical fix candidate):**
  1. On `OrdersService.create` and `OrdersService.update` (when transitioning into `Printing Queued` or later), for each `OrderItem` with a `posterId`:
     - decrement `Poster.stock` by `quantity`,
     - write an `InventoryMovement` (`type='Consumption'`, `reference=orderNo`) for any raw-material consumption rules (deferred to a `materials-per-poster` lookup, which doesn't yet exist).
  2. Block transition past `Printing Queued` if `Poster.stock < quantity` (or auto-create a `Purchase` expense — owner decision).
- **Test ownership:** Phase 5 workflow tests must today assert _absence_ of any movement after order creation, then flip to asserting decrement once fix lands.

### G2. `orderNo` and `jobNo` use unsafe `count(*) + N` generation

- **Where:** [`OrdersService.create`](../../backend/src/modules/orders/orders.service.ts) line 96–97; [`OrdersService.update`](../../backend/src/modules/orders/orders.service.ts) line 203.
- **What is wrong:** Two concurrent `POST /api/orders` requests inside a transaction will both read `count=N` and both compute `orderNo = ORD-(1048+N+1)`. Order numbers are `@unique` so one transaction will throw `P2002`; even when it doesn't, the sequence is **not stable across resets** because `1048` is a magic offset baked in to "pretend the demo started at 1049".
- **Business impact:** order placement intermittently fails under load; demo numbering looks contiguous but real production numbering will gap.
- **Suggested fix:** introduce a Postgres `SEQUENCE` (or use the existing `id` UUID) and format `orderNo` from a `nextval` call; same for `jobNo`. Move the offset into a settings column if humans need to start from `ORD-1049`.
- **Test ownership:** Phase 11 API test should fire 10 parallel `POST /api/orders` and assert all succeed with distinct `orderNo`.

### G3. Customer counters are **not reversed** when orders change or are deleted

- **Where:** [`OrdersService.create`](../../backend/src/modules/orders/orders.service.ts) increments `customer.orderCount` and `customer.lifetimeValue`; [`OrdersService.delete`](../../backend/src/modules/orders/orders.service.ts) calls `prisma.order.delete` with no decrement, and `OrdersService.update` does not adjust the customer when `total` changes.
- **Business impact:** `Customer.lifetimeValue` and `Customer.orderCount` drift permanently after any delete or total-change. CRM filters ("top customers") and reports become wrong.
- **Suggested fix:** wrap delete and update in a transaction that recomputes (or delta-adjusts) the two counters. `SetupService.syncCustomerStats()` already exists as a one-shot rebuild — extract it into a helper and call it on every relevant write.
- **Test ownership:** Phase 5 workflow tests should explicitly assert counter consistency after `DELETE /api/orders/:id` and after a `total` change.

### G4. Demo mode (`X-App-Mode: demo` header) is a **full RBAC bypass**

- **Where:** [`requireModuleAccess`](../../backend/src/auth/role-access.ts) line 44, [`requireModuleWrite`](../../backend/src/auth/role-access.ts) line 71 — both short-circuit if `c.get('isDemo')` is true. Frontend stamps the header from local storage flag `APP_MODE_DEMO`.
- **Business impact:** anyone able to set the header in their browser dev tools (or a reverse proxy) becomes effectively SUPER_ADMIN on every module. In production this is exploitable.
- **Mitigations to verify:** the frontend `app-mode` flag is set by `SetupService.initializeDemo` (`demoMode: true` in `Settings`) and the API likely only honours the header when `settings.demoMode = true`. **Need to verify** — the current middleware code in [`backend/src/middleware/protect.ts`](../../backend/src/middleware/protect.ts) and [`backend/src/middleware/auth.ts`](../../backend/src/middleware/auth.ts) was not exhaustively read in Phase 1 (only the role-access matrix). Phase 1.5 follow-up: read these files and confirm.
- **Suggested fix:** demo bypass should require **both** the header AND a server-side check that `Settings.demoMode = true` AND a dev/staging env guard. In production, the header should be ignored.
- **Test ownership:** Phase 7 RBAC suite must run with demo mode disabled and confirm that all 8 personas hit their expected 403s.

---

## 3. P1 — Major

### G5. `Invoice` model exists but **no API, no service, no UI**

- **Schema:** `Invoice { id, orderId, amount, pdfUrl, invoiceNo }` with FK to `Order`.
- **Reality:** No `/api/invoices` mount in [`backend/src/app.ts`](../../backend/src/app.ts), no `invoices.service.ts`, no frontend page. The Finance UI does not surface invoices. The seed file does not insert invoices.
- **Suggested fix:** Either implement minimal CRUD + PDF generation (jsPDF / server-side) and surface in Finance page, or **drop the model** from the schema to avoid implying a feature that doesn't exist.
- **Test ownership:** Phase 16 readiness audit will record this as "schema-only feature". If implemented in Phase 5/14, add E2E.

### G6. `Coupon` CRUD exists but coupons are **never applied** to any order

- **Where:** Coupon CRUD at `/api/coupons` is FULL. `Order` schema has no `couponId`, no `discountAmount`, no `discountPercent`. `OrdersService.create` doesn't accept a coupon code. The finance/dashboard computations don't subtract coupon discounts from revenue.
- **Suggested fix:** add `Order.couponId` (nullable FK), add `discount: number` to `OrderItem` or `Order`, update `OrdersService.create` to take a coupon code, apply discount, and decrement coupon usage count (also add `Coupon.usageCount` / `usageLimit`).
- **Test ownership:** Phase 5 customer/orders workflow tests should currently assert coupon UI is "metadata-only" and skip discount math; flip on fix.

### G7. Production stage updates, shipment updates, and uploads are **not audited**

- **Where:** [`production.routes.ts`](../../backend/src/modules/production/production.routes.ts), [`shipments.routes.ts`](../../backend/src/modules/shipments/shipments.routes.ts), [`upload.routes.ts`](../../backend/src/modules/upload/upload.routes.ts) — none call `audit.log`.
- **Business impact:** production state transitions, who changed shipment status, and who uploaded which artwork are unobservable. Compliance / regulator-friendliness suffers.
- **Suggested fix:** add `audit.log({ action: 'stage_change' | 'operator_assign', entity: 'production', entityId: jobId, metadata: { fromStage, toStage } })` etc. Same in shipments + upload.
- **Test ownership:** Phase 8 DB validation tests will today assert _absence_ of audit rows for these mutations; flip on fix.

### G8. **Status drift bug** — production-job stays stale when shipment is marked Delivered

- **Where:** [`ShipmentsService.updateStatus`](../../backend/src/modules/shipments/shipments.service.ts) line 86-91 — when `status='Delivered'`, the service updates `orders.status = 'Delivered'` but does **NOT** update `production_jobs.stage`.
- **Symptom:** A delivered order can show `productionJob.stage = 'Ready for Shipping'` indefinitely. Dashboard `productionPipeline` includes the stale row in its non-terminal counts.
- **Suggested fix:** in the same transaction, `UPDATE production_jobs SET stage='Delivered' WHERE orderId = shipment.orderId`.
- **Test ownership:** Phase 5 workflow test asserts the drift today (expected current behaviour), flips on fix.

### G9. **Status drift bug** — `Ready for Pickup` via `PUT /api/orders/:id` doesn't update production-job

- **Where:** [`OrdersService.update`](../../backend/src/modules/orders/orders.service.ts) line 200 — `productionStages` excludes `Ready for Pickup` and `Ready for Shipping`, and the terminal branch only handles `Delivered`/`Cancelled`. So setting an order to `Ready for Pickup` via the Orders UI updates `orders.status` but leaves `production_jobs.stage` unchanged.
- **Suggested fix:** add `Ready for Pickup` to the upserted-job branch, or refactor so `OrdersService.update` mirrors any status into `production_jobs.stage` whenever both exist.

### G10. `Expense` has no UPDATE endpoint and supplier outstanding cannot be reversed

- **Where:** [`expenses.routes.ts`](../../backend/src/modules/expenses/expenses.routes.ts) exposes `POST` and `DELETE`, no `PUT`. [`ExpensesService.create`](../../backend/src/modules/expenses/expenses.service.ts) decrements `supplier.outstanding`, but [`ExpensesService.delete`](../../backend/src/modules/expenses/expenses.service.ts) does **not** re-credit the supplier.
- **Business impact:** a mis-entered expense permanently distorts vendor outstanding balances; the only recovery is a compensating manual entry.
- **Suggested fix:** add `PUT /api/expenses/:id` with delta logic; in `delete`, also re-credit `supplier.outstanding` in the same transaction.

### G11. Purchases module is a **frontend rename of expenses**, not a distinct domain

- **Where:** [`PurchasesPage`](../../frontend/src/app/features/purchases/pages/purchases-page/purchases-page.ts) calls `/api/expenses` directly. There is no `PurchaseOrder` entity, no PO lifecycle (`Draft → Approved → Received → Closed`), no link to inventory receipt.
- **Business impact:** the sidebar promises a "Purchases" module but the user just gets an expense ledger. The dependency map shows this clearly as **PARTIAL**.
- **Decision needed (Phase 16):** rename the module to "Purchase Ledger" in the UI to match reality, **or** scope a future `purchase_orders` table with proper PO → inventory_movement workflow.

### G12. Artwork uploads have **no DELETE endpoint**; Supabase Storage objects leak on order delete

- **Where:** [`artworks.routes.ts`](../../backend/src/modules/artworks/artworks.routes.ts) only exposes `GET`. The Prisma cascade on `Order` delete removes the DB row but the bucket object remains, accumulating storage cost.
- **Suggested fix:** `DELETE /api/artworks/:id` that calls `supabase.storage.from('artworks').remove([path])` then `prisma.artworkUpload.delete`; add a cleanup hook on order delete.

### G13. `production-routes` operator assign accepts free-text instead of validating against `app_users`

- **Where:** [`production.routes.ts`](../../backend/src/modules/production/production.routes.ts) — `operatorAssignSchema` only requires `min(2)` string.
- **Symptom:** anyone can mistype an operator name (`Joeyy` vs `Joey`) and dashboards count the wrong person. Re-assignment can't be audited reliably.
- **Suggested fix:** make `operator` a UUID FK to `AppUser` (with role check `PRODUCTION_OPERATOR | MANAGER`) or at minimum validate against a whitelist surfaced from `/api/users?role=PRODUCTION_OPERATOR`.

---

## 4. P2 — Minor (quality / observability / scope)

### G14. Toast feedback is inconsistent across CRUD modules

- **Where:** `MessageService` is only used in [`login-page.ts`](../../frontend/src/app/features/auth/pages/login/login-page.ts) and [`users-page.ts`](../../frontend/src/app/features/admin/users/pages/users-page/users-page.ts). The PrimeNG `<p-toast>` shell exists in [`app.html`](../../frontend/src/app/app.html) but feature pages don't push messages on save / delete / upload / error.
- **Suggested fix (Phase 14 / cross-cutting):** add a thin `ToastService` wrapper at `core/services/` and wire it into orders, customers, inventory, catalog, production (stage + operator), shipments, expenses, posters, coupons, vendors create/update/delete/upload success + error paths.

### G15. CSV export only covers four modules, no PDF, no period-scoping

- **Where:** [`reports.routes.ts`](../../backend/src/modules/reports/reports.routes.ts) — exporter switches over `customers | inventory | expenses | orders`, everything else hits the default `orders` case (potentially confusing). Period filter is **not honoured** in the export query (always pulls all rows).
- **Suggested fix:** wire `parsePeriodFromQuery` into the export query; add `posters`, `production`, `shipments`, `partners`, `audit-logs` exports; offer XLSX / PDF (e.g. `exceljs`, `pdfkit`).

### G16. No `PosterCategory` CRUD UI

- **Where:** Schema has `PosterCategory` and `Poster.categoryId` FK, but no `/api/poster-categories` and no UI. `Poster.category` (string) is what the catalog displays. The FK relation is unused.
- **Suggested fix:** either drop the model or surface a categories CRUD UI and link posters through the FK only (drop the string column).

### G17. Demo seed is not idempotent

- **Where:** [`SetupService.initializeDemo`](../../backend/src/modules/setup/setup.service.ts) — runs `wipeDatabase()` first, then bulk inserts. Acceptable for a "reset" verb, but: running it twice in quick succession can race against an ongoing read (no locks). Also, `setupCompleted: true` may already be true when calling `wipeDatabase` (which deletes settings) — order of operations means a partial failure could leave `settings` row missing.
- **Suggested fix:** wrap the demo init in a single `prisma.$transaction([...])`; or set `setupCompleted=false` first and switch to true at the very end.

### G18. No rate limiting / abuse protection on `/api/upload` or `/api/setup/*`

- **Where:** No middleware reviewed in Phase 1 indicates rate limits. The setup endpoints are protected by RBAC (only SUPER_ADMIN), but a panicked operator can still call them.
- **Suggested fix:** add a confirmation-token check (UI sends `confirm: "RESET_PROD"` in body to acknowledge intent) and a 1-call-per-60s soft limit.

### G19. No idempotency keys on POST endpoints

- **Symptom:** double-click on the orders dialog can create two orders; the same applies to expenses and uploads.
- **Suggested fix:** accept an `Idempotency-Key` header that the service stores transiently (e.g. small `request_idempotency` table) and returns the same response on retry.

### G20. No AR (accounts receivable) / AP (accounts payable) modules

- **Symptom:** `Order.paid` (collected) vs `Order.total` (invoiced) is the only AR signal, and there's no UI to record partial payments after order creation. Suppliers have `outstanding` but no payment-history table.
- **Suggested fix (long-term):** add `Payment { orderId, amount, receivedAt, method }` table and a "record payment" UI on order detail; same for supplier payments.

### G21. `lib/prisma` connection pool not surveyed in Phase 1

- **Symptom (suspected):** Vercel functions invoke the Hono `app.fetch` per request; if Prisma client is not properly singleton'd via `globalThis` we could exhaust DB connections under modest concurrency.
- **Phase 11 / 13 follow-up:** read `backend/src/lib/prisma.ts` and confirm singleton + warm-up + `connection_limit`.

### G22. `lib/supabase-admin` exposure must be confirmed safe for serverless

- **Symptom:** `supabaseAdmin` (service-role key) is referenced in [`users.service.ts`](../../backend/src/modules/users/users.service.ts) to invite/delete auth users. Service role bypasses RLS — verify the key is **only** present in server env, never bundled to the frontend.

### G23. No OpenAPI / Swagger surface for most routes

- **Where:** [`app.ts`](../../backend/src/app.ts) exposes a hand-coded `/api/openapi.json` that lists 6 of the ~80 endpoints. There is no auto-generation from validators (Hono + Zod can be wired with `@hono/zod-openapi`).
- **Suggested fix:** adopt `@hono/zod-openapi` so route schemas become the API contract; Phase 11 API tests can also consume the contract.

---

## 5. P3 — Nits

### G24. `'Operator Unassigned'` sentinel string

- **Where:** [`OrdersService.create`](../../backend/src/modules/orders/orders.service.ts) line 154; checked by [`DashboardService.isUnassignedOperator`](../../backend/src/modules/dashboard/dashboard.service.ts) line 19. Any i18n change to that string breaks the dashboard counter.
- **Suggested fix:** make `ProductionJob.operator` nullable (use NULL) instead of a sentinel string.

### G25. Hardcoded `'Delhivery'` / `'Delhi'` defaults

- **Where:** [`OrdersService.update`](../../backend/src/modules/orders/orders.service.ts) line 246; [`ProductionService.updateStage`](../../backend/src/modules/production/production.service.ts) line 85. Production shipments always default to Delhivery to Delhi.
- **Suggested fix:** read defaults from `Settings` or remove auto-creation entirely (force the user to fill in the shipment dialog).

### G26. Hardcoded `1048` / `500` offsets for order/job numbering

- **Where:** see G2. Magic numbers are also brittle for tests — every Phase 5 test that constructs a fixture order number must be aware of the offset.

### G27. `as any` casts in service code

- Two of the four services we read used `where: any = {}`. Not a hard bug but kills type safety on filter inputs (e.g. typos in `status` allowed at runtime).

### G28. Status enum duplicated in 3 places

- Production validator, OrdersService branch logic, Print Queue UI filter — all hand-maintained lists of stage strings. Risk of drift when new stages are added.
- **Suggested fix:** extract to a shared `const STAGES = [...]` in `shared/erp.constants.ts` (frontend) and `backend/src/constants/stages.ts`.

### G29. `OperationPage` fallback route is reachable but unused

- The catch-all `path: ':module'` route in [`app.routes.ts`](../../frontend/src/app/app.routes.ts) loads `OperationPage`, but every module name in `NAV_GROUPS` has an explicit route earlier in the table. So the fallback is **dead code** in normal use. Only manual URL hacking can reach it.
- **Suggested fix:** delete the fallback route or replace with a friendly 404 page (`/auth/unauthorized` style).

---

## 6. Cross-cutting observations (will inform Phase 16)

| Observation | Implication |
|---|---|
| Three different services can mutate `Order.status` and they don't all sync `ProductionJob.stage` and `Shipment.status` | Workflow tests must use UI/API/DB triangulation per step (see W3 / W4 in [`workflow-map.md`](workflow-map.md)) |
| Coverage of `audit_logs` is uneven (orders/customers/inventory/expenses/users only) | RBAC + DB validation tests must whitelist which mutations are audited |
| Setup endpoints are destructive and exposed via UI | CI policy + Playwright globalSetup gate against `DATABASE_URL` ⇒ TEST project |
| Storage objects orphaned on order delete | Phase 9 upload test must cover orphan-cleanup or document it |
| Coupon / Invoice features are **schema-only** | Phase 16 must either green-light implementation or schema cleanup |

---

## 7. Backlog snapshot (to track across phases)

| ID | Severity | Owner phase | Status |
|---|---|---|---|
| G1 — Order ↔ Inventory | P0 | Phase 5 critical fix candidate | Open |
| G2 — orderNo race | P0 | Phase 11 + fix | Open |
| G3 — Customer counter drift | P0 | Phase 5 + fix | Open |
| G4 — Demo bypass | P0 | Phase 7 + middleware review | Open |
| G5 — Invoice API | P1 | Phase 14 / Phase 16 decision | Open |
| G6 — Coupons orphaned | P1 | Phase 5 / Phase 14 | Open |
| G7 — Audit gaps (prod/ship/upload) | P1 | Phase 8 | Open |
| G8 — Shipment delivered ⇒ stale job | P1 | Phase 5 | Open |
| G9 — Order Ready-for-Pickup ⇒ stale job | P1 | Phase 5 | Open |
| G10 — Expense delete doesn't credit | P1 | Phase 5 | Open |
| G11 — Purchases is just expenses | P1 | Phase 16 decision | Open |
| G12 — Artwork delete missing | P1 | Phase 9 | Open |
| G13 — Operator free-text | P1 | Phase 5 / Phase 14 | Open |
| G14 — Toast inconsistency | P2 | Phase 14 | Open |
| G15 — Limited CSV export | P2 | Phase 14 | Open |
| G16 — PosterCategory unused | P2 | Phase 16 decision | Open |
| G17 — Demo seed not idempotent | P2 | Phase 2 (test infra) | Open |
| G18 — No rate limiting | P2 | Phase 15 | Open |
| G19 — Idempotency keys | P2 | Phase 11 / Phase 15 | Open |
| G20 — No AR/AP module | P2 | Phase 16 decision | Open |
| G21 — Prisma pool review | P2 | Phase 11 / Phase 13 | Open |
| G22 — Supabase service key exposure | P2 | Phase 11 (verify) | Open |
| G23 — OpenAPI gaps | P2 | Phase 11 | Open |
| G24 — Operator sentinel | P3 | Phase 14 | Open |
| G25 — Hardcoded carrier/city | P3 | Phase 14 | Open |
| G26 — Magic numbering offsets | P3 | Phase 14 | Open |
| G27 — `any` in service filters | P3 | Phase 11 | Open |
| G28 — Status enum duplication | P3 | Phase 5 / Phase 14 | Open |
| G29 — Operations fallback route | P3 | Phase 14 | Open |

This backlog rolls into the production-readiness report in Phase 16.

