import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { OrdersService } from './orders.service.js';
import { orderCreateSchema, orderUpdateSchema } from './orders.validator.js';
import { parsePeriodFromQuery, serializePeriod } from '../../utils/period.js';
import { parseQueryParams } from '../../utils/query.js';

const ordersApp = new Hono();
const service = new OrdersService();

// List Orders
ordersApp.get('/', async (c) => {
  const params = parseQueryParams(c);
  const status = c.req.query('status');
  const priority = c.req.query('priority');
  const periodQuery = c.req.query('period');
  const period = periodQuery ? parsePeriodFromQuery(c.req.query()) : undefined;

  const result = await service.list({
    search: params.search,
    status: status || undefined,
    priority: priority || undefined,
    skip: params.skip,
    take: params.take,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
    period,
  });

  const pagination = {
    page: params.page,
    limit: params.limit,
    total: result.total,
    totalPages: Math.ceil(result.total / params.limit),
  };

  if (period) {
    return c.json({
      success: true,
      data: {
        items: result.items,
        period: serializePeriod(period),
        pagination,
      },
    });
  }

  return c.json({
    success: true,
    data: result.items,
    pagination,
  });
});

// Get Single Order
ordersApp.get('/:id', async (c) => {
  const id = c.req.param('id');
  const order = await service.getById(id);

  if (!order) {
    return c.json({
      success: false,
      error: 'NotFound',
      message: 'Order not found'
    }, 404);
  }

  return c.json({
    success: true,
    data: order
  });
});

// Create Order
ordersApp.post('/', zValidator('json', orderCreateSchema), async (c) => {
  const body = c.req.valid('json');
  try {
    const order = await service.create(body);
    return c.json({
      success: true,
      data: order,
      message: 'Order placed successfully'
    }, 201);
  } catch (error: any) {
    return c.json({
      success: false,
      error: 'OrderPlacementError',
      message: error.message
    }, 400);
  }
});

// Update Order Status / Details
ordersApp.put('/:id', zValidator('json', orderUpdateSchema), async (c) => {
  const id = c.req.param('id');
  const body = c.req.valid('json');

  try {
    const order = await service.update(id, body);
    return c.json({
      success: true,
      data: order,
      message: 'Order updated successfully'
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: 'OrderUpdateError',
      message: error.message
    }, 400);
  }
});

// Delete Order
ordersApp.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await service.delete(id);

  return c.json({
    success: true,
    message: 'Order deleted successfully'
  });
});

export default ordersApp;
