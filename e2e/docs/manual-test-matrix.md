# KPrints ERP — Manual QA Test Matrix

> **Phase 4 deliverable.** Human-executable checklist for module-level validation before and alongside Playwright automation. Grounded in the [discovery audit](dependency-map.md); known gaps reference [missing-functionality-report.md](missing-functionality-report.md).
>
> **Last updated:** 2026-06-17

---

## How to use this document

1. Run against the **Supabase TEST project only** — never production. See [`e2e/README.md`](../README.md).
2. Reset deterministic fixtures: `npm run test:reset` (from repo root).
3. Sign in with a QA persona from Phase 3 (default password in `backend/.env.test` / `QA_USER_PASSWORD`).
4. Mark each row: **Pass** | **Fail** | **Blocked** | **N/A**.
5. On **Fail**, note the finding ID from the missing-functionality report when applicable (e.g. G1, G14).
6. Fill the **Automated spec** column as Playwright specs land in `e2e/tests/modules/`.

### Recommended personas

| Module area | Primary persona | Why |
|---|---|---|
| Customers, orders, catalog, inventory, production, shipments | `qa-manager` | RW on operational modules |
| Purchases / expenses, reports | `qa-finance` | RW on finance-adjacent modules |
| Production stage / print queue | `qa-production` | RW on production + print-queue |
| Settings (demo / fresh) | `qa-super-admin` | Only SUPER_ADMIN has `setup` write |
| Users & invitations | `qa-super-admin` | `admin/users` is SUPER_ADMIN-only |
| Read-only smoke | `qa-viewer` | Confirms R-only surfaces load |

### Test session header (copy per run)

| Field | Value |
|---|---|
| Tester | |
| Date | |
| Frontend URL | `http://localhost:4200` |
| Backend URL | `http://localhost:8000` |
| DB | TEST project ref |
| Git commit / branch | |
| Fixture reset? | Yes / No |
| Persona used | |

---

## Coverage summary

Legend: **Y** = implemented in UI (may still be partial) · **API** = backend only · **—** = not implemented · **Stub** = control visible but not wired

| Module | Route | Create | Read | Update | Delete | Search | Filter | Sort | Pagination | Export | Upload |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Customers | `/customers` | Y | Y | API | API | Y | — | — | Y | Stub | — |
| Orders | `/orders` | Y | Y | API | API | Y | Y | Y† | Y | Stub | — |
| Inventory | `/inventory` | Y | Y | API | API | Y | — | — | Y | API | — |
| Production | `/production` | — | Y | Y‡ | — | — | — | — | — | — | — |
| Print queue | `/print-queue` | — | Y | Y‡ | — | Y | Y | — | Y | — | — |
| Shipments | `/shipments` | Y | Y | Y§ | — | Y | — | — | Y | — | — |
| Expenses (Purchases UI) | `/purchases` | Y | Y | — | Y | Y | Y¶ | — | Y | API | — |
| Posters (Catalog UI) | `/catalog` | Y | Y | API | API | Y | Y¶ | — | Y | API | — |
| Reports | `/reports` | — | Y | — | — | — | — | — | — | Y | — |
| Settings | `/settings` | Y** | Y | — | Y** | — | — | — | — | — | — |
| Users | `/admin/users` | Y | Y | Y | Y | Y | Y | — | Y | — | — |

† Orders: column sort on `orderNo` only (client-side PrimeNG).  
‡ Production updates = operator assign (`/production`) or stage/operator (`/print-queue`).  
§ Shipments: status update only (`PUT /api/shipments/:id/status`).  
¶ Period selector scopes list data (orders, catalog, purchases), not a column filter.  
\** Settings create/delete = `Load demo data` / `Start fresh` (destructive DB operations).

---

## 1. Customers

**Route:** `/customers` · **API:** `/api/customers` · **Fixture:** `TEST_CUSTOMER_001` (Alpha Corp)

| ID | Area | Steps | Expected result | Auto spec |
|---|---|---|---|---|
| CUS-C-01 | Create | As `qa-manager`, click **Add customer**, fill name/phone/email/city/source, save | New row appears; `GET /api/customers` includes record; `audit_logs` has `create` for `customer` | `e2e/tests/modules/customers.spec.ts` — _pending_ |
| CUS-R-01 | Read list | Open `/customers` after `test:reset` | Table shows seeded customers (Alpha, Beta, Gamma, VIP); order count and lifetime value columns populated | _pending_ |
| CUS-R-02 | Read detail | `GET /api/customers/:id` for `TEST_CUSTOMER_001` | Returns full customer JSON matching list row | _pending_ |
| CUS-U-01 | Update (API) | `PUT /api/customers/:id` — change city (UI has no edit dialog) | Record updates; audit log `update` | _pending_ |
| CUS-D-01 | Delete (API) | `DELETE /api/customers/:id` for a customer with **no orders** | 200; row removed; audit log `delete` | _pending_ |
| CUS-D-02 | Delete guard | `DELETE` customer linked to orders | 409 or validation error; customer retained | _pending_ |
| CUS-S-01 | Search | Type `Alpha` in search box | Only matching rows (name, city, or phone) remain | _pending_ |
| CUS-S-02 | Search empty | Clear search | Full list restored | _pending_ |
| CUS-F-01 | Filter | — | **N/A** — no status/source filter in UI | _pending_ |
| CUS-SO-01 | Sort | — | **N/A** — no sortable columns in UI | _pending_ |
| CUS-P-01 | Pagination | Seed or create >8 customers | Paginator shows next page; row count per page = 8 | _pending_ |
| CUS-E-01 | Export button | Click **Export** in toolbar | **Stub** — button has no click handler; use `GET /api/reports/export?module=customers` for CSV | _pending_ |
| CUS-UP-01 | Upload | — | **N/A** | — |
| CUS-UX-01 | Toast on save | Create customer | **Known gap G14** — no success toast; dialog closes silently | _pending_ |

---

## 2. Orders

**Route:** `/orders` · **API:** `/api/orders` · **Fixture:** `TEST_ORDER_001` (Draft)

| ID | Area | Steps | Expected result | Auto spec |
|---|---|---|---|---|
| ORD-C-01 | Create | **New order** → select `TEST_CUSTOMER_001`, fill line item, save | Order appears with generated `orderNo`; customer `orderCount` increments | _pending_ |
| ORD-C-02 | Create validation | Submit without customer | Save disabled or API 400 | _pending_ |
| ORD-R-01 | Read list | Open orders with default period | Seeded orders visible; period subtitle matches selector | _pending_ |
| ORD-R-02 | Read detail | Click eye icon on an order | Dialog shows lines, balance, status, timeline | _pending_ |
| ORD-U-01 | Update (API) | `PUT /api/orders/:id` — change status to `Design Approved` | Status updates; production job created (see workflow map) | _pending_ |
| ORD-D-01 | Delete (API) | `DELETE /api/orders/:id` | Order removed; **verify G3** — customer counters may not decrement | _pending_ |
| ORD-S-01 | Search | Search by order number fragment | Matching rows only | _pending_ |
| ORD-F-01 | Status filter | Select `Delivered` in status dropdown | Only delivered orders shown (client-side) | _pending_ |
| ORD-F-02 | Period filter | Change period selector | List reloads from API with period query | _pending_ |
| ORD-SO-01 | Sort | Click **Order** column header | Rows sort by `orderNo` ascending/descending | _pending_ |
| ORD-P-01 | Pagination | >8 orders in view | Paginator works (8 rows/page) | _pending_ |
| ORD-E-01 | Bulk invoice | Click **Bulk invoice** | **Stub** — no action wired; invoice API absent (G5) | _pending_ |
| ORD-E-02 | CSV export | `GET /api/reports/export?module=orders` | CSV downloads with order columns | _pending_ |
| ORD-UP-01 | Upload | — | **N/A** on orders page (artwork is separate module) | — |
| ORD-RBAC-01 | Viewer write | As `qa-viewer`, confirm **New order** hidden/disabled | No create affordance | _pending_ |

---

## 3. Inventory

**Route:** `/inventory` · **API:** `/api/inventory` · **Fixture:** `TEST_INVENTORY_ITEM_001`

| ID | Area | Steps | Expected result | Auto spec |
|---|---|---|---|---|
| INV-C-01 | Create material | **Add material** (vendor required) | New SKU row; initial `InventoryMovement` of type Purchase | _pending_ |
| INV-C-02 | Stock movement | **Stock movement** → stock in (+10) | Quantity increases; `lastMovement` updates | _pending_ |
| INV-C-03 | Stock out | Log stock out movement | Quantity decreases; movement row in DB | _pending_ |
| INV-R-01 | Read list | Open inventory after reset | Four seeded items with health indicators | _pending_ |
| INV-R-02 | Read detail | `GET /api/inventory/:id` | Includes movements relation | _pending_ |
| INV-U-01 | Update (API) | `PUT /api/inventory/:id` — change reorder level | Field updates; audit logged | _pending_ |
| INV-D-01 | Delete (API) | `DELETE /api/inventory/:id` with no blocking FKs | Item removed | _pending_ |
| INV-S-01 | Search | Search by SKU or material name | Filtered rows | _pending_ |
| INV-F-01 | Filter | — | **N/A** — no category/low-stock filter chips | _pending_ |
| INV-SO-01 | Sort | — | **N/A** in UI | _pending_ |
| INV-P-01 | Pagination | >8 items | Paginator advances | _pending_ |
| INV-E-01 | Export | `GET /api/reports/export?module=inventory` | CSV with supplier column | _pending_ |
| INV-UP-01 | Upload | — | **N/A** | — |
| INV-LINK-01 | Create purchase shortcut | Click **Create purchase** | Navigates to `/purchases?new=true` with dialog open | _pending_ |
| INV-GAP-01 | Order consumption | Create order for poster stock | **G1** — poster/inventory stock NOT auto-decremented | _pending_ |

---

## 4. Production

**Route:** `/production` · **API:** `/api/production` · **Fixture:** jobs linked to `TEST_ORDER_002+`

| ID | Area | Steps | Expected result | Auto spec |
|---|---|---|---|---|
| PRD-C-01 | Create | — | **N/A** — jobs auto-created when order reaches production stages | _pending_ |
| PRD-R-01 | Read kanban | Open production page | Kanban columns per stage; cards show jobNo, customer, priority | _pending_ |
| PRD-R-02 | Read table | Scroll to print queue table | All jobs listed with stage/operator/ETA | _pending_ |
| PRD-U-01 | Assign operator | **Assign operator** → pick job, enter name, save | `PUT /api/production/:id/operator` succeeds; operator column updates | _pending_ |
| PRD-U-02 | Stage update (UI) | Use **Print queue** module (`/print-queue`) → **Update stage** on a job | Stage changes; order status mirrors (workflow map) | _pending_ |
| PRD-D-01 | Delete | — | **N/A** — jobs cascade from order delete only | — |
| PRD-S-01 | Search | — | **N/A** on production page (use print-queue) | — |
| PRD-F-01 | Filter | — | **N/A** on production page | — |
| PRD-SO-01 | Sort | — | **N/A** | — |
| PRD-P-01 | Pagination | — | **N/A** — full list, no paginator on production table | — |
| PRD-E-01 | Export | — | **N/A** | — |
| PRD-UP-01 | Upload | — | **N/A** | — |
| PRD-GAP-01 | Audit | Change stage via API | **G7** — no `audit_logs` entry for production mutations | _pending_ |

### 4b. Print queue (production subset)

**Route:** `/print-queue` · Same API as production

| ID | Area | Steps | Expected result | Auto spec |
|---|---|---|---|---|
| PQ-R-01 | Read | Open print queue | Table of in-progress jobs | _pending_ |
| PQ-S-01 | Search | Search job or order number | Filtered list | _pending_ |
| PQ-F-01 | Stage filter | Select `Packaging` | Only packaging-stage jobs | _pending_ |
| PQ-P-01 | Pagination | >10 jobs | 10 rows per page | _pending_ |
| PQ-U-01 | Operator | Assign operator from row action | Operator saved | _pending_ |

---

## 5. Shipments

**Route:** `/shipments` · **API:** `/api/shipments` · **Fixture:** seeded Packed + Delivered

| ID | Area | Steps | Expected result | Auto spec |
|---|---|---|---|---|
| SHP-C-01 | Create | **New shipment** — fill orderNo, customer, carrier, tracking, city, ETA | Row appears in table | _pending_ |
| SHP-R-01 | Read list | Open shipments | Seeded shipments visible | _pending_ |
| SHP-U-01 | Update status | Click **Status** → set `Delivered` | Shipment status updates; linked `orders.status` → Delivered | _pending_ |
| SHP-U-02 | Status mirror | After deliver, check production job stage | **G8** — production stage may remain stale (`Ready for Shipping`) | _pending_ |
| SHP-D-01 | Delete | — | **N/A** — no delete endpoint/UI | — |
| SHP-S-01 | Search | Search tracking or order number | Filtered rows | _pending_ |
| SHP-F-01 | Filter | — | **N/A** | — |
| SHP-SO-01 | Sort | — | **N/A** | — |
| SHP-P-01 | Pagination | >8 shipments | Paginator works | _pending_ |
| SHP-E-01 | Export | — | **N/A** in reports export (not in 4-module CSV set) | — |
| SHP-UP-01 | Upload | — | **N/A** | — |

---

## 6. Expenses (Purchases UI)

**Route:** `/purchases` · **API:** `/api/expenses` · **Fixture:** `TEST_EXPENSE_001`

| ID | Area | Steps | Expected result | Auto spec |
|---|---|---|---|---|
| EXP-C-01 | Create | **Record purchase** — date, category, vendor, amount, payment | Row appears; finance summary reflects expense | _pending_ |
| EXP-R-01 | Read list | Open purchases with period | Expenses listed with Recorded status chip | _pending_ |
| EXP-U-01 | Update | — | **N/A** — no `PUT /api/expenses/:id` (G10) | _pending_ |
| EXP-D-01 | Delete | Click trash on a row | Row removed from UI and DB | _pending_ |
| EXP-D-02 | Supplier balance | Delete expense that had `supplierId` | **G10** — supplier `outstanding` may not be re-credited | _pending_ |
| EXP-S-01 | Search | Search vendor or category | Filtered rows | _pending_ |
| EXP-F-01 | Period | Change period selector | List scoped to period from API | _pending_ |
| EXP-SO-01 | Sort | — | **N/A** | — |
| EXP-P-01 | Pagination | >8 expenses | Paginator works | _pending_ |
| EXP-E-01 | Export | `GET /api/reports/export?module=expenses` | CSV download | _pending_ |
| EXP-UP-01 | Upload | — | **N/A** | — |
| EXP-NOTE-01 | Module naming | Compare sidebar "Purchases" vs data model | **G11** — UI is expense ledger, not purchase orders | _pending_ |

---

## 7. Posters (Catalog UI)

**Route:** `/catalog` · **API:** `/api/posters` · **Fixture:** `TEST_POSTER_001`

| ID | Area | Steps | Expected result | Auto spec |
|---|---|---|---|---|
| PST-C-01 | Create | **Add poster** — title, SKU, category, size, price, stock | Poster row appears; `soldThisMonth` from API period rollup | _pending_ |
| PST-R-01 | Read list | Open catalog | Posters with stock and sales column for active period | _pending_ |
| PST-R-02 | Read detail | `GET /api/posters/:id` | Matches table fields | _pending_ |
| PST-U-01 | Update (API) | `PUT /api/posters/:id` — change price/stock | Updated in list after refresh | _pending_ |
| PST-D-01 | Delete (API) | `DELETE /api/posters/:id` not referenced by order lines | Poster removed | _pending_ |
| PST-S-01 | Search | Search SKU or title | Filtered rows | _pending_ |
| PST-F-01 | Period | Change period selector | `soldThisMonth` column label and values update | _pending_ |
| PST-SO-01 | Sort | — | **N/A** | — |
| PST-P-01 | Pagination | >8 posters | Paginator works | _pending_ |
| PST-E-01 | Export | Reports export | **N/A** — posters not in CSV export modules (G15) | _pending_ |
| PST-UP-01 | Image upload | — | **N/A** — no poster image upload in catalog UI | — |
| PST-STUB-01 | Manage tags | Click **Manage tags** | **Stub** — button not wired | _pending_ |

---

## 8. Reports

**Routes:** `/reports`, `/reports/financial-statements` · **API:** `/api/reports/*`

| ID | Area | Steps | Expected result | Auto spec |
|---|---|---|---|---|
| RPT-R-01 | Read hub | Open `/reports` | Financial Statements card links to sub-page | _pending_ |
| RPT-R-02 | Quarterly tab | Financial statements → Quarterly Results | Table loads 8 period columns or empty state with no error | _pending_ |
| RPT-R-03 | P&L tab | Switch to Profit & Loss | Rows render; totals sensible vs seeded orders/expenses | _pending_ |
| RPT-R-04 | Balance sheet | Balance sheet tab | Table + info notes if present | _pending_ |
| RPT-R-05 | Cash flow | Cash flow tab | Table + notes | _pending_ |
| RPT-E-01 | CSV customers | Authenticated `GET /api/reports/export?module=customers` | `customers-report.csv` attachment | _pending_ |
| RPT-E-02 | CSV orders | `module=orders` | Orders CSV | _pending_ |
| RPT-E-03 | CSV inventory | `module=inventory` | Inventory CSV | _pending_ |
| RPT-E-04 | CSV expenses | `module=expenses` | Expenses CSV | _pending_ |
| RPT-E-05 | Unknown module | `module=posters` | **G15** — falls through to orders export or wrong data; document actual behaviour | _pending_ |
| RPT-E-06 | Period on export | Export with `period` query | **G15** — period not applied; exports all rows | _pending_ |
| RPT-C/U/D | CRUD | — | **N/A** — read-only analytics | — |
| RPT-S/F/SO/P | Search/filter/sort/page | — | **N/A** on statement tables | — |
| RPT-UP-01 | Upload | — | **N/A** | — |
| RPT-RBAC-01 | Viewer | As `qa-viewer`, open reports | Page loads (read access) | _pending_ |

---

## 9. Settings

**Route:** `/settings` · **API:** `/api/setup/*` · **Destructive — TEST DB only**

| ID | Area | Steps | Expected result | Auto spec |
|---|---|---|---|---|
| SET-R-01 | Read status | Open settings | Tag shows Demo / Fresh / Not initialized / error | _pending_ |
| SET-R-02 | Backend down | Stop API, open settings | Error panel with **Retry** | _pending_ |
| SET-C-01 | Start fresh | As `qa-super-admin`, **Start fresh** + confirm | DB wiped except users; `setupCompleted=true`, `demoMode=false` | _pending_ |
| SET-C-02 | Load demo | **Load demo data** + confirm | Full demo seed; `demoMode=true`; dashboard populated | _pending_ |
| SET-D-01 | Implicit delete | Either setup action | All transactional data removed before re-seed | _pending_ |
| SET-U-01 | Update | — | **N/A** — no incremental settings edit UI | — |
| SET-S/F/SO/P | Search/filter/sort/page | — | **N/A** | — |
| SET-E/UP | Export/upload | — | **N/A** | — |
| SET-RBAC-01 | Non-super-admin | As `qa-admin`, open settings | Page may load but setup POST returns 403 | _pending_ |
| SET-SAFE-01 | Production guard | Attempt reset with prod `DATABASE_URL` | CLI/script refuses (`assertTestEnvironment`) | _pending_ |

---

## 10. Users (Admin)

**Route:** `/admin/users` · **API:** `/api/users`, `/api/invitations` · **Persona:** `qa-super-admin`

| ID | Area | Steps | Expected result | Auto spec |
|---|---|---|---|---|
| USR-C-01 | Invite | **Invite user** — email + role | Invitation row appears; email sent (or logged in TEST) | _pending_ |
| USR-R-01 | Read list | Load users page | Active, pending, invited rows; current user hidden | _pending_ |
| USR-U-01 | Change role | Open role dialog → assign MANAGER | `PATCH /api/users/:id/role` succeeds; toast shown | _pending_ |
| USR-U-02 | Approve | Approve pending user | Status → active | _pending_ |
| USR-D-01 | Deactivate | Deactivate user | Status → disabled; user cannot access app | _pending_ |
| USR-D-02 | Revoke invite | Delete pending invitation | Invitation removed | _pending_ |
| USR-S-01 | Search | Search email (Enter) | Server-filtered list | _pending_ |
| USR-F-01 | Role filter | Filter by FINANCE | Only finance users/invites | _pending_ |
| USR-F-02 | Status filter | Filter `pending` | Pending accounts only | _pending_ |
| USR-SO-01 | Sort | — | **N/A** | — |
| USR-P-01 | Pagination | Many users | Paginator on table | _pending_ |
| USR-E-01 | Export | — | **N/A** | — |
| USR-UP-01 | Avatar upload | — | **N/A** in current users UI | — |
| USR-RBAC-01 | Admin denied | As `qa-admin`, navigate to `/admin/users` | Redirect or unauthorized (SUPER_ADMIN only) | _pending_ |

---

## 11. Cross-cutting: Artwork uploads (related to orders)

**Route:** `/artwork-uploads` · **API:** `GET /api/artworks`, `POST /api/upload`

| ID | Area | Steps | Expected result | Auto spec |
|---|---|---|---|---|
| ART-C-01 | Upload | **Upload artwork** → select order + PNG/PDF file | Row in table; file in Supabase `artworks` bucket; DB `artwork_uploads` row | `e2e/tests/uploads/artwork.spec.ts` — _pending_ |
| ART-R-01 | Read list | Open artwork uploads | Seeded/uploaded files listed with preview link | _pending_ |
| ART-D-01 | Delete | — | **N/A** — no DELETE endpoint (G12) | _pending_ |
| ART-S-01 | Search | Search by order or filename | Client-filtered rows | _pending_ |
| ART-P-01 | Pagination | >8 uploads | Paginator works | _pending_ |

---

## 12. API-only checks (when UI lacks the operation)

Use these when validating backend contracts during manual runs without waiting for UI parity.

| Module | Operation | Request | Expect |
|---|---|---|---|
| Customers | List pagination | `GET /api/customers?page=1&limit=2&sortBy=name&sortOrder=asc` | `pagination.totalPages` correct |
| Orders | Server search | `GET /api/orders?search=ORD&status=Delivered` | Filtered items |
| Posters | Delete | `DELETE /api/posters/:id` | 200 or 409 if referenced |
| Inventory | Movement | `POST /api/inventory/:id/movements` | Quantity delta |
| Production | Stage | `PUT /api/production/:id/stage` `{ "stage": "Packaging" }` | Job + order updated |
| Expenses | Missing update | `PUT /api/expenses/:id` | **404** until G10 fixed |

---

## Automation backlog (fill as specs merge)

| Planned spec path | Modules covered | Phase |
|---|---|---|
| `e2e/tests/workflows/customer-order.workflow.spec.ts` | CUS-*, ORD-* (W1–W2) | **5** |
| `e2e/tests/workflows/order-production.workflow.spec.ts` | ORD-*, PRD-* (W3) | **5** |
| `e2e/tests/workflows/production-shipment.workflow.spec.ts` | PRD-*, SHP-* (W3–W4) | **5** |
| `e2e/tests/workflows/inventory-expense.workflow.spec.ts` | INV-GAP, EXP-*, dashboard KPIs | **5** |
| `e2e/tests/workflows/full-pipeline.workflow.spec.ts` | End-to-end pipeline + finance | **5** |
| `e2e/tests/modules/customers.spec.ts` | CUS-* (CRUD matrix) | _pending_ |

---

## Sign-off

| Module | Manual pass rate | Blockers | Tester sign-off |
|---|---|---|---|
| Customers | /13 | | |
| Orders | /15 | | |
| Inventory | /15 | | |
| Production + Print queue | /18 | | |
| Shipments | /11 | | |
| Expenses | /12 | | |
| Posters | /12 | | |
| Reports | /14 | | |
| Settings | /10 | | |
| Users | /14 | | |
| Artwork uploads | /5 | | |

**Overall ready for workflow E2E (Phase 5)?** Yes / No — notes:
