/**
 * W3 — Order status → Production job
 *
 * Advancing to Design Approved spawns a production_jobs row.
 */

import { createCustomer, createOrder, updateOrderStatus } from '../../factories/index.js';
import { test, expect, loginAs } from '../../fixtures/workflow-fixtures.js';

test.describe('Workflow W3: Order → Production', () => {
  test('Design Approved creates production job (API + DB)', async ({ api, db }) => {
    const customer = await createCustomer(api);
    const order = await createOrder(api, {
      customerId: customer.id,
      lines: [{ description: 'Production spawn test', size: '18 x 24 in', quantity: 1, unitPrice: 750 }],
    });

    expect(order.productionJob).toBeFalsy();

    const updated = await updateOrderStatus(api, order.id, 'Design Approved');
    expect(updated.status).toBe('Design Approved');
    expect(updated.productionJob?.stage).toBe('Design Approved');

    const dbOrder = await db.getOrder(order.id);
    expect(dbOrder?.productionJob).not.toBeNull();
    expect(dbOrder?.productionJob?.stage).toBe('Design Approved');
    expect(dbOrder?.productionJob?.jobNo).toMatch(/^JOB-/);
  });

  test('production job visible in print queue UI', async ({ page, api }) => {
    const customer = await createCustomer(api);
    const order = await createOrder(api, {
      customerId: customer.id,
      lines: [{ description: 'Print queue UI test', size: 'A3', quantity: 1, unitPrice: 400 }],
    });
    const advanced = await updateOrderStatus(api, order.id, 'Printing Queued');

    await loginAs(page, 'qa-production');
    await page.goto('/print-queue');
    await expect(page.getByRole('heading', { name: /print queue/i })).toBeVisible();

    await page.getByPlaceholder(/search jobs/i).fill(advanced.productionJob!.jobNo);
    await expect(page.getByText(advanced.productionJob!.jobNo)).toBeVisible();
    await expect(page.getByText(customer.name)).toBeVisible();
  });
});
