/**
 * End-to-end happy path: customer → order → production → shipment → finance KPIs.
 */

import {
  advanceProductionStage,
  createCustomer,
  createExpense,
  createOrder,
  updateOrderStatus,
} from '../../factories/index.js';
import { fetchDashboardMetrics, fetchFinanceSummary, updateShipmentStatus } from '../../helpers/workflow.js';
import { test, expect } from '../../fixtures/workflow-fixtures.js';

test.describe('Workflow: full business pipeline', () => {
  test('customer through delivery updates revenue and order count KPIs', async ({ api, db }) => {
    const financeBefore = await fetchFinanceSummary(api);
    const dashBefore = await fetchDashboardMetrics(api);

    const customer = await createCustomer(api, { name: 'Pipeline Customer' });
    const lineTotal = 1200;
    const order = await createOrder(api, {
      customerId: customer.id,
      total: lineTotal,
      lines: [{ description: 'Pipeline poster', size: 'A3', quantity: 1, unitPrice: lineTotal }],
    });

    await updateOrderStatus(api, order.id, 'Design Approved');
    const job = await db.getProductionJobByOrderId(order.id);
    await advanceProductionStage(api, job!.id, 'Packaging');
    await advanceProductionStage(api, job!.id, 'Ready for Shipping');

    const shipment = await db.getShipmentByOrderId(order.id);
    await updateShipmentStatus(api, shipment!.id, 'Delivered');

    const financeAfter = await fetchFinanceSummary(api);
    const dashAfter = await fetchDashboardMetrics(api);

    expect(financeAfter.revenue).toBe(financeBefore.revenue + lineTotal);
    expect(financeAfter.orderCount).toBe(financeBefore.orderCount + 1);
    expect(dashAfter.kpis.orderCount).toBe(dashBefore.kpis.orderCount + 1);
    expect(dashAfter.kpis.revenue).toBe(dashBefore.kpis.revenue + lineTotal);

    const dbOrder = await db.getOrder(order.id);
    expect(dbOrder?.status).toBe('Delivered');
  });
});

test.describe('Workflow: expense after operations', () => {
  test.use({ qaSlug: 'qa-finance' });

  test('expense reduces profit KPI', async ({ api }) => {
    const before = await fetchFinanceSummary(api);
    await createExpense(api, { amount: 500, vendor: 'Pipeline Overhead' });
    const after = await fetchFinanceSummary(api);
    expect(after.profit).toBe(before.profit - 500);
  });
});
