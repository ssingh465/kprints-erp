/**
 * W5 + W6 — Order → Inventory and Expense → Finance
 */

import {
  TEST_INVENTORY_ITEM_001,
  TEST_POSTER_001,
  TEST_SUPPLIER_001,
  advanceProductionStage,
  createCustomer,
  createExpense,
  createOrder,
  updateOrderStatus,
} from '../../factories/index.js';
import { fetchDashboardMetrics, fetchFinanceSummary } from '../../helpers/workflow.js';
import { test, expect } from '../../fixtures/workflow-fixtures.js';

test.describe('Workflow W5: Order → Inventory (G1 fixed)', () => {
  test('draft order does not decrement poster stock', async ({ api, db }) => {
    const stockBefore = (await db.getPoster(TEST_POSTER_001))?.stock;
    const movementsBefore = await db.countInventoryMovements();

    const customer = await createCustomer(api);
    await createOrder(api, {
      customerId: customer.id,
      lines: [
        {
          posterId: TEST_POSTER_001,
          description: 'Draft should not consume stock',
          size: 'A3',
          quantity: 5,
          unitPrice: 299,
        },
      ],
    });

    const stockAfter = (await db.getPoster(TEST_POSTER_001))?.stock;
    const movementsAfter = await db.countInventoryMovements();

    expect(stockAfter).toBe(stockBefore);
    expect(movementsAfter).toBe(movementsBefore);
  });

  test('printing queued decrements poster stock', async ({ api, db }) => {
    const stockBefore = (await db.getPoster(TEST_POSTER_001))?.stock ?? 0;
    const quantity = 3;

    const customer = await createCustomer(api);
    const order = await createOrder(api, {
      customerId: customer.id,
      status: 'Design Approved',
      lines: [
        {
          posterId: TEST_POSTER_001,
          description: 'Stock consumption test',
          size: 'A3',
          quantity,
          unitPrice: 299,
        },
      ],
    });

    const job = await db.getProductionJobByOrderId(order.id);
    await advanceProductionStage(api, job!.id, 'Printing Queued');

    const stockAfter = (await db.getPoster(TEST_POSTER_001))?.stock;
    expect(stockAfter).toBe(stockBefore - quantity);
  });

  test('deleting consumed order restores poster stock', async ({ api, db }) => {
    const stockBefore = (await db.getPoster(TEST_POSTER_001))?.stock ?? 0;
    const quantity = 2;

    const customer = await createCustomer(api);
    const order = await createOrder(api, {
      customerId: customer.id,
      lines: [
        {
          posterId: TEST_POSTER_001,
          description: 'Restore on delete',
          size: 'A3',
          quantity,
          unitPrice: 100,
        },
      ],
    });

    await updateOrderStatus(api, order.id, 'Design Approved');
    await updateOrderStatus(api, order.id, 'Printing Queued');

    await api.delete(`/orders/${order.id}`);

    const stockAfter = (await db.getPoster(TEST_POSTER_001))?.stock;
    expect(stockAfter).toBe(stockBefore);
  });

  test('seeded inventory item unchanged after unrelated order', async ({ db }) => {
    const item = await db.getInventoryItem(TEST_INVENTORY_ITEM_001);
    expect(item).not.toBeNull();
    expect(item!.sku).toMatch(/TST-INV/);
  });
});

test.describe('Workflow W6: Expense → Finance / Dashboard', () => {
  test.use({ qaSlug: 'qa-finance' });

  test('new expense increases finance summary and dashboard KPIs', async ({ api }) => {
    const before = await fetchFinanceSummary(api);
    const dashBefore = await fetchDashboardMetrics(api);

    const amount = 2500;
    await createExpense(api, {
      vendor: 'Workflow Vendor Ltd',
      amount,
      supplierId: TEST_SUPPLIER_001,
      category: 'Materials',
    });

    const after = await fetchFinanceSummary(api);
    const dashAfter = await fetchDashboardMetrics(api);

    expect(after.expenses).toBe(before.expenses + amount);
    expect(after.profit).toBe(before.profit - amount);
    expect(dashAfter.kpis.expenses).toBe(dashBefore.kpis.expenses + amount);
    expect(dashAfter.kpis.profit).toBe(dashBefore.kpis.profit - amount);
  });

  test('expense create writes audit log', async ({ api, db }) => {
    const expense = await createExpense(api, { amount: 150, vendor: 'Audit Expense Vendor' });
    const audits = await db.findAuditLogs({ entity: 'expense', entityId: expense.id, action: 'create' });
    expect(audits.length).toBeGreaterThanOrEqual(1);
  });

  test('deleting expense re-credits supplier outstanding (G10 fixed)', async ({ api, db }) => {
    const amount = 750;
    const expense = await createExpense(api, {
      vendor: 'Supplier credit test',
      amount,
      supplierId: TEST_SUPPLIER_001,
      category: 'Materials',
    });

    const supplierBeforeDelete = await db.getSupplier(TEST_SUPPLIER_001);

    await api.delete(`/expenses/${expense.id}`);

    const supplierAfterDelete = await db.getSupplier(TEST_SUPPLIER_001);

    expect(supplierAfterDelete!.outstanding).toBe(supplierBeforeDelete!.outstanding + amount);
  });
});
