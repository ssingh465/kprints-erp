/**
 * W3b + W4 — Production stage → Shipment
 *
 * Uses ProductionService path (print-queue API) as primary UX per workflow-map.md.
 */

import {
  advanceProductionStage,
  createCustomer,
  createOrder,
  updateOrderStatus,
} from '../../factories/index.js';
import { updateShipmentStatus } from '../../helpers/workflow.js';
import { test, expect } from '../../fixtures/workflow-fixtures.js';

test.describe('Workflow: Production → Shipment → Delivered', () => {
  test('Ready for Shipping creates shipment via production stage API', async ({ api, db }) => {
    const customer = await createCustomer(api);
    const order = await createOrder(api, {
      customerId: customer.id,
      status: 'Design Approved',
      lines: [{ description: 'Shipment auto-create', size: 'A3', quantity: 1, unitPrice: 600 }],
    });

    const job = await db.getProductionJobByOrderId(order.id);
    expect(job).not.toBeNull();
    const jobId = job!.id;

    await advanceProductionStage(api, jobId, 'Printing Queued');
    await advanceProductionStage(api, jobId, 'Printing In Progress');
    await advanceProductionStage(api, jobId, 'Packaging');
    const advanced = await advanceProductionStage(api, jobId, 'Ready for Shipping');

    expect(advanced.stage).toBe('Ready for Shipping');

    const dbShipment = await db.getShipmentByOrderId(order.id);
    expect(dbShipment).not.toBeNull();
    expect(dbShipment?.status).toBe('Packed');
    expect(dbShipment?.orderNo).toBe(order.orderNo);

    const apiOrder = await api.get<{ success: boolean; data: { status: string } }>(
      `/orders/${order.id}`
    );
    expect(apiOrder.data.status).toBe('Ready for Shipping');
  });

  test('shipment Delivered mirrors order.status (production stage may drift — G8)', async ({ api, db }) => {
    const customer = await createCustomer(api);
    const order = await createOrder(api, {
      customerId: customer.id,
      status: 'Design Approved',
      lines: [{ description: 'Delivered path', size: 'A3', quantity: 1, unitPrice: 800 }],
    });

    const job = await db.getProductionJobByOrderId(order.id);
    expect(job).not.toBeNull();

    await advanceProductionStage(api, job!.id, 'Printing Queued');
    await advanceProductionStage(api, job!.id, 'Packaging');
    await advanceProductionStage(api, job!.id, 'Ready for Shipping');

    const shipment = await db.getShipmentByOrderId(order.id);
    expect(shipment).not.toBeNull();

    await updateShipmentStatus(api, shipment!.id, 'Delivered');

    const dbOrder = await db.getOrder(order.id);
    expect(dbOrder?.status).toBe('Delivered');

    const dbJob = await db.getProductionJobByOrderId(order.id);
    // Documented gap G8: production job stage is NOT updated on shipment deliver.
    expect(dbJob?.stage).not.toBe('Delivered');
  });

  test('Orders PUT to Ready for Shipping also creates shipment', async ({ api, db }) => {
    const customer = await createCustomer(api);
    const order = await createOrder(api, {
      customerId: customer.id,
      lines: [{ description: 'Orders path shipping', size: 'A3', quantity: 1, unitPrice: 550 }],
    });

    await updateOrderStatus(api, order.id, 'Design Approved');
    await updateOrderStatus(api, order.id, 'Packaging');
    await updateOrderStatus(api, order.id, 'Ready for Shipping');

    const dbShipment = await db.getShipmentByOrderId(order.id);
    expect(dbShipment).not.toBeNull();
    expect(dbShipment?.status).toBe('Packed');
  });
});
