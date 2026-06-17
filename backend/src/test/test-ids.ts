/**
 * Canonical, deterministic UUIDs for the TEST_* fixture set.
 *
 * Layout: every TEST fixture UUID follows the form
 *   <ENTITY-TYPE>-1111-1111-1111-NNNNNNNNNNNN
 * where ENTITY-TYPE is a hex-encoded entity discriminator so ids remain
 * human-scannable while satisfying Postgres @db.Uuid (hex digits only).
 *
 * Prefix legend (first UUID group = entity type, zero-padded hex):
 *   01000001 — customers
 *   02000001 — posters
 *   03000001 — suppliers
 *   04000001 — inventory items
 *   05000001 — orders
 *   05000001 + line suffix — order items (…10000000000N)
 *   06000001 — production jobs
 *   07000001 — shipments
 *   08000001 — expenses
 *   09000001 — coupons
 *   0a000001 — partners
 *
 * Pure constants — no runtime side effects, no Prisma dependency.
 * Re-exported from e2e/factories/test-ids.ts so Playwright tests and
 * backend scripts share a single source of truth.
 */

// ---------- Customers ------------------------------------------------
export const TEST_CUSTOMER_001 = '01000001-1111-1111-1111-000000000001';
export const TEST_CUSTOMER_002 = '01000001-1111-1111-1111-000000000002';
export const TEST_CUSTOMER_003 = '01000001-1111-1111-1111-000000000003';
export const TEST_CUSTOMER_VIP = '01000001-1111-1111-1111-000000000099';

// ---------- Posters --------------------------------------------------
export const TEST_POSTER_001 = '02000001-1111-1111-1111-000000000001';
export const TEST_POSTER_002_OUT_OF_STOCK = '02000001-1111-1111-1111-000000000002';
export const TEST_POSTER_003_LOW_STOCK = '02000001-1111-1111-1111-000000000003';
export const TEST_POSTER_004_PERSONALIZED = '02000001-1111-1111-1111-000000000004';

// ---------- Suppliers ------------------------------------------------
export const TEST_SUPPLIER_001 = '03000001-1111-1111-1111-000000000001';
export const TEST_SUPPLIER_002_NO_BALANCE = '03000001-1111-1111-1111-000000000002';
export const TEST_SUPPLIER_003_OVERDUE = '03000001-1111-1111-1111-000000000003';

// ---------- Inventory items -----------------------------------------
export const TEST_INVENTORY_ITEM_001 = '04000001-1111-1111-1111-000000000001';
export const TEST_INVENTORY_ITEM_002_LOW = '04000001-1111-1111-1111-000000000002';
export const TEST_INVENTORY_ITEM_003_ALERT = '04000001-1111-1111-1111-000000000003';
export const TEST_INVENTORY_ITEM_004_FRAMES = '04000001-1111-1111-1111-000000000004';

// ---------- Orders ---------------------------------------------------
// Status coverage spans the canonical Order.status state machine
// (workflow-map.md §1) so a single seeded TEST_* set lets workflow tests
// pick any starting status without bespoke setup.
export const TEST_ORDER_001_DRAFT = '05000001-1111-1111-1111-000000000001';
export const TEST_ORDER_002_DESIGN_PENDING = '05000001-1111-1111-1111-000000000002';
export const TEST_ORDER_003_PRINTING = '05000001-1111-1111-1111-000000000003';
export const TEST_ORDER_004_READY_FOR_SHIPPING = '05000001-1111-1111-1111-000000000004';
export const TEST_ORDER_005_DELIVERED = '05000001-1111-1111-1111-000000000005';
export const TEST_ORDER_006_CANCELLED = '05000001-1111-1111-1111-000000000006';

// First-line item id per seeded order (orders that have one)
export const TEST_ORDER_ITEM_001 = '05000001-1111-1111-1111-100000000001';
export const TEST_ORDER_ITEM_002 = '05000001-1111-1111-1111-100000000002';
export const TEST_ORDER_ITEM_003 = '05000001-1111-1111-1111-100000000003';
export const TEST_ORDER_ITEM_004 = '05000001-1111-1111-1111-100000000004';
export const TEST_ORDER_ITEM_005 = '05000001-1111-1111-1111-100000000005';
export const TEST_ORDER_ITEM_006 = '05000001-1111-1111-1111-100000000006';

// ---------- Production jobs (paired with orders 003/004/005) --------
export const TEST_PRODUCTION_JOB_001 = '06000001-1111-1111-1111-000000000001';
export const TEST_PRODUCTION_JOB_002 = '06000001-1111-1111-1111-000000000002';
export const TEST_PRODUCTION_JOB_003 = '06000001-1111-1111-1111-000000000003';

// ---------- Shipments (paired with orders 004 + 005) ----------------
export const TEST_SHIPMENT_001_PACKED = '07000001-1111-1111-1111-000000000001';
export const TEST_SHIPMENT_002_DELIVERED = '07000001-1111-1111-1111-000000000002';

// ---------- Expenses -------------------------------------------------
export const TEST_EXPENSE_001 = '08000001-1111-1111-1111-000000000001';
export const TEST_EXPENSE_002_NO_SUPPLIER = '08000001-1111-1111-1111-000000000002';

// ---------- Coupons --------------------------------------------------
export const TEST_COUPON_001_ACTIVE = '09000001-1111-1111-1111-000000000001';
export const TEST_COUPON_002_INACTIVE = '09000001-1111-1111-1111-000000000002';

// ---------- Partners -------------------------------------------------
export const TEST_PARTNER_001 = '0a000001-1111-1111-1111-000000000001';
export const TEST_PARTNER_002 = '0a000001-1111-1111-1111-000000000002';

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
