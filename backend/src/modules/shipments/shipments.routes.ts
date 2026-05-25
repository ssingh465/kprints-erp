import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { ShipmentsService } from './shipments.service.js';
import { parseQueryParams } from '../../utils/query.js';

const shipmentsApp = new Hono();
const service = new ShipmentsService();

const statusUpdateSchema = z.object({
  status: z.enum(['Packed', 'In Transit', 'Out for Delivery', 'Delivered', 'Delayed'], {
    errorMap: () => ({ message: 'Invalid shipment tracking status' })
  })
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

// Update Shipment Status (syncs underlying Order status if Delivered)
shipmentsApp.put('/:id/status', zValidator('json', statusUpdateSchema), async (c) => {
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
