/**
 * Canonical, deterministic UUIDs for the TEST_* fixture set.
 *
 * Layout: every TEST fixture UUID follows the form
 *   <ENTITY-PREFIX>-1111-1111-1111-NNNNNNNNNNNN
 * so a human can recognise a "test fixture" id at a glance versus a
 * real Supabase-generated id (random hex in every group).
 *
 * Prefix legend:
 *   c0000001 — customers
 *   p0000002 — posters
 *   s0000003 — suppliers
 *   i0000004 — inventory items
 *   o0000005 — orders
 *   o0000005 + line — order items (suffix index)
 *   j0000006 — production jobs
 *   h0000007 — shipments
 *   e0000008 — expenses
 *   k0000009 — coupons
 *   r0000010 — partners
 *
 * Pure constants — no runtime side effects, no Prisma dependency.
 * Re-exported from e2e/factories/test-ids.ts so Playwright tests and
 * backend scripts share a single source of truth.
 */

// ---------- Customers ------------------------------------------------
export const TEST_CUSTOMER_001 = 'c0000001-1111-1111-1111-000000000001';
export const TEST_CUSTOMER_002 = 'c0000001-1111-1111-1111-000000000002';
export const TEST_CUSTOMER_003 = 'c0000001-1111-1111-1111-000000000003';
export const TEST_CUSTOMER_VIP = 'c0000001-1111-1111-1111-000000000099';

// ---------- Posters --------------------------------------------------
export const TEST_POSTER_001 = 'p0000002-1111-1111-1111-000000000001';
export const TEST_POSTER_002_OUT_OF_STOCK = 'p0000002-1111-1111-1111-000000000002';
export const TEST_POSTER_003_LOW_STOCK = 'p0000002-1111-1111-1111-000000000003';
export const TEST_POSTER_004_PERSONALIZED = 'p0000002-1111-1111-1111-000000000004';

// ---------- Suppliers ------------------------------------------------
export const TEST_SUPPLIER_001 = 's0000003-1111-1111-1111-000000000001';
export const TEST_SUPPLIER_002_NO_BALANCE = 's0000003-1111-1111-1111-000000000002';
export const TEST_SUPPLIER_003_OVERDUE = 's0000003-1111-1111-1111-000000000003';

// ---------- Inventory items -----------------------------------------
export const TEST_INVENTORY_ITEM_001 = 'i0000004-1111-1111-1111-000000000001';
export const TEST_INVENTORY_ITEM_002_LOW = 'i0000004-1111-1111-1111-000000000002';
export const TEST_INVENTORY_ITEM_003_ALERT = 'i0000004-1111-1111-1111-000000000003';
export const TEST_INVENTORY_ITEM_004_FRAMES = 'i0000004-1111-1111-1111-000000000004';

// ---------- Orders ---------------------------------------------------
// Status coverage spans the canonical Order.status state machine
// (workflow-map.md §1) so a single seeded TEST_* set lets workflow tests
// pick any starting status without bespoke setup.
export const TEST_ORDER_001_DRAFT = 'o0000005-1111-1111-1111-000000000001';
export const TEST_ORDER_002_DESIGN_PENDING = 'o0000005-1111-1111-1111-000000000002';
export const TEST_ORDER_003_PRINTING = 'o0000005-1111-1111-1111-000000000003';
export const TEST_ORDER_004_READY_FOR_SHIPPING = 'o0000005-1111-1111-1111-000000000004';
export const TEST_ORDER_005_DELIVERED = 'o0000005-1111-1111-1111-000000000005';
export const TEST_ORDER_006_CANCELLED = 'o0000005-1111-1111-1111-000000000006';

// First-line item id per seeded order (orders that have one)
export const TEST_ORDER_ITEM_001 = 'o0000005-1111-1111-1111-100000000001';
export const TEST_ORDER_ITEM_002 = 'o0000005-1111-1111-1111-100000000002';
export const TEST_ORDER_ITEM_003 = 'o0000005-1111-1111-1111-100000000003';
export const TEST_ORDER_ITEM_004 = 'o0000005-1111-1111-1111-100000000004';
export const TEST_ORDER_ITEM_005 = 'o0000005-1111-1111-1111-100000000005';
export const TEST_ORDER_ITEM_006 = 'o0000005-1111-1111-1111-100000000006';

// ---------- Production jobs (paired with orders 003/004/005) --------
export const TEST_PRODUCTION_JOB_001 = 'j0000006-1111-1111-1111-000000000001';
export const TEST_PRODUCTION_JOB_002 = 'j0000006-1111-1111-1111-000000000002';
export const TEST_PRODUCTION_JOB_003 = 'j0000006-1111-1111-1111-000000000003';

// ---------- Shipments (paired with orders 004 + 005) ----------------
export const TEST_SHIPMENT_001_PACKED = 'h0000007-1111-1111-1111-000000000001';
export const TEST_SHIPMENT_002_DELIVERED = 'h0000007-1111-1111-1111-000000000002';

// ---------- Expenses -------------------------------------------------
export const TEST_EXPENSE_001 = 'e0000008-1111-1111-1111-000000000001';
export const TEST_EXPENSE_002_NO_SUPPLIER = 'e0000008-1111-1111-1111-000000000002';

// ---------- Coupons --------------------------------------------------
export const TEST_COUPON_001_ACTIVE = 'k0000009-1111-1111-1111-000000000001';
export const TEST_COUPON_002_INACTIVE = 'k0000009-1111-1111-1111-000000000002';

// ---------- Partners -------------------------------------------------
export const TEST_PARTNER_001 = 'r0000010-1111-1111-1111-000000000001';
export const TEST_PARTNER_002 = 'r0000010-1111-1111-1111-000000000002';

// ---------- Deterministic identifiers (non-UUID) --------------------
// Order numbers and job numbers used by the seeder so workflow tests
// can assert against stable display values regardless of run order.
export const TEST_ORDER_NO = {
  DRAFT: 'TST-ORD-0001',
  DESIGN_PENDING: 'TST-ORD-0002',
  PRINTING: 'TST-ORD-0003',
  READY_FOR_SHIPPING: 'TST-ORD-0004',
  DELIVERED: 'TST-ORD-0005',
  CANCELLED: 'TST-ORD-0006',
} as const;

export const TEST_JOB_NO = {
  PRINTING: 'TST-JOB-0001',
  READY_FOR_SHIPPING: 'TST-JOB-0002',
  DELIVERED: 'TST-JOB-0003',
} as const;

export const TEST_TRACKING_NO = {
  PACKED: 'TST-TRK-0000001',
  DELIVERED: 'TST-TRK-0000002',
} as const;

export const TEST_POSTER_SKU = {
  IN_STOCK: 'TST-POS-IN-STOCK',
  OUT_OF_STOCK: 'TST-POS-OUT',
  LOW_STOCK: 'TST-POS-LOW',
  PERSONALIZED: 'TST-POS-PERS',
} as const;

export const TEST_INVENTORY_SKU = {
  HEALTHY: 'TST-INV-HEALTHY',
  LOW: 'TST-INV-LOW',
  ALERT: 'TST-INV-ALERT',
  FRAMES: 'TST-INV-FRAMES',
} as const;
