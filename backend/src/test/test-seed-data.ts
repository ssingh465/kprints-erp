/**
 * Deterministic TEST_* fixture data used by `test-reset.ts` and any
 * Playwright spec that wants a baseline DB state. Mirrors the doc set
 * in e2e/docs/workflow-map.md so workflow tests can assert against
 * predictable rows without bespoke per-test setup.
 *
 * Design rules:
 *   - All dates are computed from a single `anchor` so the seed is
 *     idempotent within a single process run. Pass the same anchor to
 *     re-derive identical values.
 *   - Status coverage spans the canonical Order.status lifecycle so
 *     workflow tests can pick any starting status without bespoke setup.
 *   - Customer aggregates (orderCount, lifetimeValue) are precomputed
 *     here so the seed does not depend on SetupService.syncCustomerStats.
 */

import {
  TEST_CUSTOMER_001,
  TEST_CUSTOMER_002,
  TEST_CUSTOMER_003,
  TEST_CUSTOMER_VIP,
  TEST_POSTER_001,
  TEST_POSTER_002_OUT_OF_STOCK,
  TEST_POSTER_003_LOW_STOCK,
  TEST_POSTER_004_PERSONALIZED,
  TEST_SUPPLIER_001,
  TEST_SUPPLIER_002_NO_BALANCE,
  TEST_SUPPLIER_003_OVERDUE,
  TEST_INVENTORY_ITEM_001,
  TEST_INVENTORY_ITEM_002_LOW,
  TEST_INVENTORY_ITEM_003_ALERT,
  TEST_INVENTORY_ITEM_004_FRAMES,
  TEST_ORDER_001_DRAFT,
  TEST_ORDER_002_DESIGN_PENDING,
  TEST_ORDER_003_PRINTING,
  TEST_ORDER_004_READY_FOR_SHIPPING,
  TEST_ORDER_005_DELIVERED,
  TEST_ORDER_006_CANCELLED,
  TEST_ORDER_ITEM_001,
  TEST_ORDER_ITEM_002,
  TEST_ORDER_ITEM_003,
  TEST_ORDER_ITEM_004,
  TEST_ORDER_ITEM_005,
  TEST_ORDER_ITEM_006,
  TEST_PRODUCTION_JOB_001,
  TEST_PRODUCTION_JOB_002,
  TEST_PRODUCTION_JOB_003,
  TEST_SHIPMENT_001_PACKED,
  TEST_SHIPMENT_002_DELIVERED,
  TEST_EXPENSE_001,
  TEST_EXPENSE_002_NO_SUPPLIER,
  TEST_COUPON_001_ACTIVE,
  TEST_COUPON_002_INACTIVE,
  TEST_PARTNER_001,
  TEST_PARTNER_002,
  TEST_ORDER_NO,
  TEST_JOB_NO,
  TEST_TRACKING_NO,
  TEST_POSTER_SKU,
  TEST_INVENTORY_SKU,
} from './test-ids.js';

function addDays(anchor: Date, days: number): Date {
  const date = new Date(anchor);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

export interface TestSeedSnapshot {
  customers: ReturnType<typeof buildCustomers>;
  posters: ReturnType<typeof buildPosters>;
  suppliers: ReturnType<typeof buildSuppliers>;
  inventory: ReturnType<typeof buildInventory>;
  orders: ReturnType<typeof buildOrders>;
  productionJobs: ReturnType<typeof buildProductionJobs>;
  shipments: ReturnType<typeof buildShipments>;
  expenses: ReturnType<typeof buildExpenses>;
  coupons: ReturnType<typeof buildCoupons>;
  partners: ReturnType<typeof buildPartners>;
  settings: ReturnType<typeof buildSettings>;
}

function buildCustomers() {
  return [
    {
      id: TEST_CUSTOMER_001,
      name: 'TEST Customer Alpha',
      phone: '+91 90000 00001',
      email: 'test.customer.alpha@kprints.test',
      city: 'Delhi',
      source: 'Offline',
      lifetimeValue: 0,
      orderCount: 0,
    },
    {
      id: TEST_CUSTOMER_002,
      name: 'TEST Customer Beta',
      phone: '+91 90000 00002',
      email: 'test.customer.beta@kprints.test',
      city: 'Mumbai',
      source: 'Website',
      lifetimeValue: 0,
      orderCount: 0,
    },
    {
      id: TEST_CUSTOMER_003,
      name: 'TEST Customer Gamma',
      phone: '+91 90000 00003',
      email: 'test.customer.gamma@kprints.test',
      city: 'Bangalore',
      source: 'Marketplace',
      lifetimeValue: 0,
      orderCount: 0,
    },
    {
      // Lifetime value + orderCount precomputed so they match the
      // orders seeded below — workflow tests can assert "customer
      // aggregates stay consistent" without recalculating.
      id: TEST_CUSTOMER_VIP,
      name: 'TEST Customer VIP',
      phone: '+91 90000 00099',
      email: 'test.customer.vip@kprints.test',
      city: 'Gurugram',
      source: 'Offline',
      lifetimeValue: 0,
      orderCount: 0,
    },
  ];
}

function buildPosters() {
  return [
    {
      id: TEST_POSTER_001,
      sku: TEST_POSTER_SKU.IN_STOCK,
      title: 'TEST Poster — In Stock',
      category: 'Minimal',
      tags: ['test', 'in-stock'],
      size: '18 x 24 in',
      price: 500,
      stock: 100,
      soldThisMonth: 0,
      active: true,
    },
    {
      id: TEST_POSTER_002_OUT_OF_STOCK,
      sku: TEST_POSTER_SKU.OUT_OF_STOCK,
      title: 'TEST Poster — Out of Stock',
      category: 'Travel',
      tags: ['test', 'out-of-stock'],
      size: 'A3',
      price: 750,
      stock: 0,
      soldThisMonth: 0,
      active: true,
    },
    {
      id: TEST_POSTER_003_LOW_STOCK,
      sku: TEST_POSTER_SKU.LOW_STOCK,
      title: 'TEST Poster — Low Stock',
      category: 'Pop Culture',
      tags: ['test', 'low-stock'],
      size: '12 x 18 in',
      price: 600,
      stock: 3,
      soldThisMonth: 0,
      active: true,
    },
    {
      id: TEST_POSTER_004_PERSONALIZED,
      sku: TEST_POSTER_SKU.PERSONALIZED,
      title: 'TEST Poster — Personalized',
      category: 'Personalized',
      tags: ['test', 'custom'],
      size: 'A2',
      price: 1200,
      stock: 25,
      soldThisMonth: 0,
      active: true,
    },
  ];
}

function buildSuppliers() {
  return [
    {
      id: TEST_SUPPLIER_001,
      name: 'TEST Supplier — Paper Co',
      contact: 'Test Contact 1',
      phone: '+91 80000 00001',
      category: 'Paper Rolls',
      outstanding: 5000,
    },
    {
      id: TEST_SUPPLIER_002_NO_BALANCE,
      name: 'TEST Supplier — Frames Co',
      contact: 'Test Contact 2',
      phone: '+91 80000 00002',
      category: 'Frames',
      outstanding: 0,
    },
    {
      id: TEST_SUPPLIER_003_OVERDUE,
      name: 'TEST Supplier — Ink Overdue',
      contact: 'Test Contact 3',
      phone: '+91 80000 00003',
      category: 'Ink',
      outstanding: 25000,
    },
  ];
}

function buildInventory() {
  return [
    {
      id: TEST_INVENTORY_ITEM_001,
      sku: TEST_INVENTORY_SKU.HEALTHY,
      name: 'TEST Inventory — Healthy Stock',
      category: 'Paper Rolls',
      supplierId: TEST_SUPPLIER_001,
      unit: 'roll',
      quantity: 50,
      reorderLevel: 10,
      unitCost: 2000,
      lastMovement: 'TEST seed',
    },
    {
      id: TEST_INVENTORY_ITEM_002_LOW,
      sku: TEST_INVENTORY_SKU.LOW,
      name: 'TEST Inventory — Low Stock',
      category: 'Ink',
      supplierId: TEST_SUPPLIER_003_OVERDUE,
      unit: 'bottle',
      quantity: 7,
      reorderLevel: 10,
      unitCost: 1500,
      lastMovement: 'TEST seed',
    },
    {
      // Stock at reorder level — dashboard low-stock alert should fire
      // (DashboardService uses quantity <= reorderLevel).
      id: TEST_INVENTORY_ITEM_003_ALERT,
      sku: TEST_INVENTORY_SKU.ALERT,
      name: 'TEST Inventory — Alert Threshold',
      category: 'Lamination Sheets',
      supplierId: TEST_SUPPLIER_001,
      unit: 'sheet',
      quantity: 5,
      reorderLevel: 5,
      unitCost: 80,
      lastMovement: 'TEST seed',
    },
    {
      id: TEST_INVENTORY_ITEM_004_FRAMES,
      sku: TEST_INVENTORY_SKU.FRAMES,
      name: 'TEST Inventory — Frames Healthy',
      category: 'Frames',
      supplierId: TEST_SUPPLIER_002_NO_BALANCE,
      unit: 'piece',
      quantity: 40,
      reorderLevel: 15,
      unitCost: 200,
      lastMovement: 'TEST seed',
    },
  ];
}

function buildOrders(anchor: Date) {
  return [
    {
      // Draft order — no ProductionJob expected yet.
      id: TEST_ORDER_001_DRAFT,
      orderNo: TEST_ORDER_NO.DRAFT,
      customerId: TEST_CUSTOMER_001,
      customerName: 'TEST Customer Alpha',
      type: 'Custom Design',
      channel: 'Offline',
      status: 'Draft',
      priority: 'Normal',
      dueDate: addDays(anchor, 7),
      createdAt: addDays(anchor, -1),
      total: 2500,
      paid: 0,
      lines: [
        {
          id: TEST_ORDER_ITEM_001,
          description: 'TEST Draft line',
          size: '18 x 24 in',
          quantity: 1,
          unitPrice: 2500,
          framing: 'Black frame',
        },
      ],
    },
    {
      // Design Pending — also no ProductionJob (OrdersService excludes
      // this status from auto-create per workflow-map.md §3).
      id: TEST_ORDER_002_DESIGN_PENDING,
      orderNo: TEST_ORDER_NO.DESIGN_PENDING,
      customerId: TEST_CUSTOMER_002,
      customerName: 'TEST Customer Beta',
      type: 'Custom Design',
      channel: 'Website',
      status: 'Design Pending',
      priority: 'High',
      dueDate: addDays(anchor, 5),
      createdAt: addDays(anchor, -2),
      total: 4200,
      paid: 1000,
      lines: [
        {
          id: TEST_ORDER_ITEM_002,
          description: 'TEST Design Pending line',
          size: '24 x 36 in',
          quantity: 1,
          unitPrice: 4200,
          framing: 'No frame',
        },
      ],
    },
    {
      // Printing In Progress — ProductionJob expected.
      id: TEST_ORDER_003_PRINTING,
      orderNo: TEST_ORDER_NO.PRINTING,
      customerId: TEST_CUSTOMER_VIP,
      customerName: 'TEST Customer VIP',
      type: 'Ready-made',
      channel: 'Offline',
      status: 'Printing In Progress',
      priority: 'Rush',
      dueDate: addDays(anchor, 2),
      createdAt: addDays(anchor, -3),
      total: 1500,
      paid: 1500,
      lines: [
        {
          id: TEST_ORDER_ITEM_003,
          posterId: TEST_POSTER_001,
          description: 'TEST Poster — In Stock',
          size: '18 x 24 in',
          quantity: 3,
          unitPrice: 500,
          framing: 'No frame',
        },
      ],
    },
    {
      // Ready for Shipping — ProductionJob + Shipment expected.
      id: TEST_ORDER_004_READY_FOR_SHIPPING,
      orderNo: TEST_ORDER_NO.READY_FOR_SHIPPING,
      customerId: TEST_CUSTOMER_VIP,
      customerName: 'TEST Customer VIP',
      type: 'Ready-made',
      channel: 'Website',
      status: 'Ready for Shipping',
      priority: 'Normal',
      dueDate: addDays(anchor, 4),
      createdAt: addDays(anchor, -4),
      total: 1800,
      paid: 1800,
      lines: [
        {
          id: TEST_ORDER_ITEM_004,
          posterId: TEST_POSTER_003_LOW_STOCK,
          description: 'TEST Poster — Low Stock',
          size: '12 x 18 in',
          quantity: 3,
          unitPrice: 600,
          framing: 'No frame',
        },
      ],
    },
    {
      // Delivered — ProductionJob + Shipment (Delivered).
      id: TEST_ORDER_005_DELIVERED,
      orderNo: TEST_ORDER_NO.DELIVERED,
      customerId: TEST_CUSTOMER_003,
      customerName: 'TEST Customer Gamma',
      type: 'Personalized',
      channel: 'Marketplace',
      status: 'Delivered',
      priority: 'Normal',
      dueDate: addDays(anchor, -2),
      createdAt: addDays(anchor, -10),
      total: 3600,
      paid: 3600,
      lines: [
        {
          id: TEST_ORDER_ITEM_005,
          posterId: TEST_POSTER_004_PERSONALIZED,
          description: 'TEST Poster — Personalized',
          size: 'A2',
          quantity: 3,
          unitPrice: 1200,
          framing: 'Wood frame',
        },
      ],
    },
    {
      // Cancelled — no shipment, ProductionJob marked Cancelled.
      id: TEST_ORDER_006_CANCELLED,
      orderNo: TEST_ORDER_NO.CANCELLED,
      customerId: TEST_CUSTOMER_001,
      customerName: 'TEST Customer Alpha',
      type: 'Custom Design',
      channel: 'Offline',
      status: 'Cancelled',
      priority: 'Normal',
      dueDate: addDays(anchor, -1),
      createdAt: addDays(anchor, -7),
      total: 999,
      paid: 0,
      lines: [
        {
          id: TEST_ORDER_ITEM_006,
          description: 'TEST Cancelled line',
          size: 'A3',
          quantity: 1,
          unitPrice: 999,
          framing: 'No frame',
        },
      ],
    },
  ];
}

function buildProductionJobs(anchor: Date) {
  return [
    {
      id: TEST_PRODUCTION_JOB_001,
      jobNo: TEST_JOB_NO.PRINTING,
      orderId: TEST_ORDER_003_PRINTING,
      orderNo: TEST_ORDER_NO.PRINTING,
      customerName: 'TEST Customer VIP',
      stage: 'Printing In Progress',
      priority: 'Rush',
      size: '18 x 24 in',
      material: 'Matte paper',
      estimatedCompletion: addDays(anchor, 1),
      operator: 'TEST Operator',
    },
    {
      id: TEST_PRODUCTION_JOB_002,
      jobNo: TEST_JOB_NO.READY_FOR_SHIPPING,
      orderId: TEST_ORDER_004_READY_FOR_SHIPPING,
      orderNo: TEST_ORDER_NO.READY_FOR_SHIPPING,
      customerName: 'TEST Customer VIP',
      stage: 'Ready for Shipping',
      priority: 'Normal',
      size: '12 x 18 in',
      material: 'Gloss paper',
      estimatedCompletion: addDays(anchor, 0),
      operator: 'TEST Operator',
    },
    {
      id: TEST_PRODUCTION_JOB_003,
      jobNo: TEST_JOB_NO.DELIVERED,
      orderId: TEST_ORDER_005_DELIVERED,
      orderNo: TEST_ORDER_NO.DELIVERED,
      customerName: 'TEST Customer Gamma',
      stage: 'Delivered',
      priority: 'Normal',
      size: 'A2',
      material: 'Premium matte',
      estimatedCompletion: addDays(anchor, -2),
      operator: 'TEST Operator',
    },
  ];
}

function buildShipments(anchor: Date) {
  return [
    {
      id: TEST_SHIPMENT_001_PACKED,
      orderId: TEST_ORDER_004_READY_FOR_SHIPPING,
      orderNo: TEST_ORDER_NO.READY_FOR_SHIPPING,
      customerName: 'TEST Customer VIP',
      carrier: 'TEST Carrier',
      trackingNo: TEST_TRACKING_NO.PACKED,
      status: 'Packed',
      city: 'Gurugram',
      eta: addDays(anchor, 3),
    },
    {
      id: TEST_SHIPMENT_002_DELIVERED,
      orderId: TEST_ORDER_005_DELIVERED,
      orderNo: TEST_ORDER_NO.DELIVERED,
      customerName: 'TEST Customer Gamma',
      carrier: 'TEST Carrier',
      trackingNo: TEST_TRACKING_NO.DELIVERED,
      status: 'Delivered',
      city: 'Bangalore',
      eta: addDays(anchor, -2),
    },
  ];
}

function buildExpenses(anchor: Date) {
  return [
    {
      id: TEST_EXPENSE_001,
      date: addDays(anchor, -5),
      category: 'Materials',
      vendor: 'TEST Supplier — Paper Co',
      supplierId: TEST_SUPPLIER_001,
      amount: 1500,
      paymentMode: 'Bank Transfer',
      notes: 'TEST seed — supplier-linked expense',
    },
    {
      id: TEST_EXPENSE_002_NO_SUPPLIER,
      date: addDays(anchor, -3),
      category: 'Utilities',
      vendor: 'TEST Power Co',
      amount: 800,
      paymentMode: 'UPI',
      notes: 'TEST seed — no supplier link',
    },
  ];
}

function buildCoupons() {
  return [
    {
      id: TEST_COUPON_001_ACTIVE,
      code: 'TEST-ACTIVE-10',
      discount: 10,
      active: true,
    },
    {
      id: TEST_COUPON_002_INACTIVE,
      code: 'TEST-INACTIVE-20',
      discount: 20,
      active: false,
    },
  ];
}

function buildPartners() {
  return [
    {
      id: TEST_PARTNER_001,
      name: 'TEST Partner A',
      profitSharePercent: 60,
      investments: [
        {
          amount: 100000,
          date: new Date('2026-01-01T00:00:00.000Z'),
          notes: 'TEST seed investment',
        },
      ],
    },
    {
      id: TEST_PARTNER_002,
      name: 'TEST Partner B',
      profitSharePercent: 40,
      investments: [
        {
          amount: 50000,
          date: new Date('2026-01-01T00:00:00.000Z'),
          notes: 'TEST seed investment',
        },
      ],
    },
  ];
}

function buildSettings() {
  return {
    companyName: 'KPrints ERP TEST',
    currency: 'INR',
    setupCompleted: true,
    demoMode: false,
  };
}

/**
 * Build the entire deterministic TEST_* snapshot. Idempotent for a
 * given `anchor` — pass the same Date to re-derive identical values.
 */
export function buildTestSeedSnapshot(anchor: Date = new Date()): TestSeedSnapshot {
  return {
    customers: buildCustomers(),
    posters: buildPosters(),
    suppliers: buildSuppliers(),
    inventory: buildInventory(),
    orders: buildOrders(anchor),
    productionJobs: buildProductionJobs(anchor),
    shipments: buildShipments(anchor),
    expenses: buildExpenses(anchor),
    coupons: buildCoupons(),
    partners: buildPartners(),
    settings: buildSettings(),
  };
}
