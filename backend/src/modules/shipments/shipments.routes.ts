import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { ShipmentsService } from './shipments.service.js';
import { parseQueryParams } from '../../utils/query.js';
import { protect, requireWrite } from '../../middleware/protect.js';
import type { AuthVariables } from '../../types/auth.js';

const shipmentsApp = new Hono<{ Variables: AuthVariables }>();
const service = new ShipmentsService();

shipmentsApp.use('*', ...protect('shipments'));

const statusUpdateSchema = z.object({
  status: z.enum(['Packed', 'In Transit', 'Out for Delivery', 'Delivered', 'Delayed'], {
    errorMap: () => ({ message: 'Invalid shipment tracking status' })
  })
});

const shipmentCreateSchema = z.object({
  orderNo: z.string().min(3),
  customerName: z.string().min(2),
  carrier: z.string().min(2),
  trackingNo: z.string().min(4),
  status: z.enum(['Packed', 'In Transit', 'Out for Delivery', 'Delivered', 'Delayed']).default('Packed'),
  city: z.string().min(2),
  eta: z.string().min(1),
  orderId: z.string().uuid().optional(),
});

// List Shipments
shipmentsApp.get('/', async (c) => {
  const params = parseQueryParams(c);
  const status = c.req.query('status');

  const result = await service.list({
    search: params.search,
    status: status || undefined,
    skip: params.skip,
    take: params.take
  });

  return c.json({
    success: true,
    data: result.items,
    pagination: {
      page: params.page,
      limit: params.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / params.limit)
    }
  });
});

shipmentsApp.post('/', requireWrite('shipments'), zValidator('json', shipmentCreateSchema), async (c) => {
  const body = c.req.valid('json');
  try {
    const shipment = await service.create(body);
    return c.json({
      success: true,
      data: shipment,
      message: 'Shipment created successfully',
    }, 201);
  } catch (error: any) {
    return c.json({
      success: false,
      error: 'ShipmentCreateError',
      message: error.message,
    }, 400);
  }
});

// Update Shipment Status (syncs underlying Order status if Delivered)
shipmentsApp.put('/:id/status', requireWrite('shipments'), zValidator('json', statusUpdateSchema), async (c) => {
  const id = c.req.param('id');
  const body = c.req.valid('json');

  try {
    const shipment = await service.updateStatus(id, body.status);
    return c.json({
      success: true,
      data: shipment,
      message: `Shipment status successfully updated to: ${body.status}`
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: 'ShipmentUpdateError',
      message: error.message
    }, 400);
  }
});

export default shipmentsApp;
