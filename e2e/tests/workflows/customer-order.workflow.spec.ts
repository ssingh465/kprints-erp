/**
 * W1 + W2 — Customer → Order
 *
 * Asserts UI, API, and DB agree after creating a customer and placing an order.
 */

import {
  createCustomer,
  createOrder,
  TEST_POSTER_001,
} from '../../factories/index.js';
import { test, expect, loginAs } from '../../fixtures/workflow-fixtures.js';

test.describe('Workflow W1–W2: Customer → Order', () => {
  test('create customer then order updates counters (API + DB)', async ({ api, db }) => {
    const customer = await createCustomer(api, { city: 'Workflow City' });
    const before = await db.getCustomer(customer.id);
    expect(before?.orderCount).toBe(0);
    expect(before?.lifetimeValue).toBe(0);

    const order = await createOrder(api, {
      customerId: customer.id,
      lines: [
        {
          posterId: TEST_POSTER_001,
          description: 'Workflow poster line',
          size: 'A3',
          quantity: 2,
          unitPrice: 500,
        },
      ],
    });

    expect(order.orderNo).toMatch(/^ORD-/);
    expect(order.status).toBe('Draft');

    const apiCustomer = await api.get<{ success: boolean; data: { orderCount: number; lifetimeValue: number } }>(
      `/customers/${customer.id}`
    );
    expect(apiCustomer.data.orderCount).toBe(1);
    expect(apiCustomer.data.lifetimeValue).toBe(order.total);

    const dbCustomer = await db.getCustomer(customer.id);
    expect(dbCustomer?.orderCount).toBe(1);
    expect(dbCustomer?.lifetimeValue).toBe(order.total);

    const dbOrder = await db.getOrder(order.id);
    expect(dbOrder?.lines).toHaveLength(1);
    expect(dbOrder?.productionJob).toBeNull();

    const audits = await db.findAuditLogs({ entity: 'order', entityId: order.id, action: 'create' });
    expect(audits.length).toBeGreaterThanOrEqual(1);
  });

  test('new order appears in orders UI after API create', async ({ page, api }) => {
    const customer = await createCustomer(api);
    const order = await createOrder(api, {
      customerId: customer.id,
      lines: [{ description: 'UI visibility line', size: 'A3', quantity: 1, unitPrice: 299 }],
    });

    await loginAs(page, 'qa-manager');
    await page.goto('/orders');
    await expect(page.getByRole('heading', { name: /orders/i })).toBeVisible();

    await page.getByPlaceholder(/search order/i).fill(order.orderNo);
    await expect(page.getByRole('cell', { name: order.orderNo, exact: true })).toBeVisible();
    await expect(page.getByText(customer.name)).toBeVisible();
  });

  test('deleting order reverses customer counters (G3 fixed)', async ({ api, db }) => {
    const customer = await createCustomer(api);
    const order = await createOrder(api, {
      customerId: customer.id,
      lines: [{ description: 'Delete counter test', size: 'A3', quantity: 1, unitPrice: 1000 }],
    });

    await api.delete(`/orders/${order.id}`);

    const after = await db.getCustomer(customer.id);
    expect(after?.orderCount).toBe(0);
    expect(after?.lifetimeValue).toBe(0);
  });
});
