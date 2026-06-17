import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { OrdersService } from './orders.service.js';
import { orderCreateSchema, orderUpdateSchema } from './orders.validator.js';
import { parsePeriodFromQuery, serializePeriod } from '../../utils/period.js';
import { parseQueryParams } from '../../utils/query.js';
import { protect, requireWrite } from '../../middleware/protect.js';
import { audit } from '../../services/audit.service.js';
import type { AuthVariables } from '../../types/auth.js';
import type { AuthContext } from '../../middleware/auth.js';
import { replayIdempotentResponse, storeIdempotentResponse } from '../../utils/idempotency.js';

const ordersApp = new Hono<{ Variables: AuthVariables }>();
const service = new OrdersService();

ordersApp.use('*', ...protect('orders'));

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
ordersApp.post('/', requireWrite('orders'), zValidator('json', orderCreateSchema), async (c) => {
  const body = c.req.valid('json');
  const actor = c.get('appUser');
  const idempotencyKey = c.req.header('Idempotency-Key');

  const replay = await replayIdempotentResponse(idempotencyKey);
  if (replay) {
    c.header('Idempotency-Replayed', 'true');
    return c.json(replay.body, replay.statusCode as 201);
  }

  try {
    const order = await service.create(body);
    await audit.log({
      userId: actor?.id,
      action: 'create',
      entity: 'order',
      entityId: order.id,
      metadata: { orderNo: order.orderNo },
    });
    const payload = {
      success: true,
      data: order,
      message: 'Order placed successfully',
    };
    await storeIdempotentResponse(idempotencyKey, c.req.method, c.req.path, 201, payload);
    return c.json(payload, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Order placement failed';
    return c.json({
      success: false,
      error: 'OrderPlacementError',
      message,
    }, 400);
  }
});

// Update Order Status / Details
ordersApp.put('/:id', requireWrite('orders'), zValidator('json', orderUpdateSchema), async (c) => {
  const id = c.req.param('id') as string;
  const body = c.req.valid('json');
  const actor = c.get('appUser');

  try {
    const order = await service.update(id, body);
    await audit.log({
      userId: actor?.id,
      action: 'update',
      entity: 'order',
      entityId: order.id,
      metadata: { orderNo: order.orderNo, status: order.status },
    });
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
ordersApp.delete('/:id', requireWrite('orders'), async (c: AuthContext) => {
  const id = c.req.param('id') as string;
  const actor = c.get('appUser');
  const existing = await service.getById(id);

  if (!existing) {
    return c.json({
      success: false,
      error: 'NotFound',
      message: 'Order not found',
    }, 404);
  }

  await audit.log({
    userId: actor?.id,
    action: 'delete',
    entity: 'order',
    entityId: id,
    metadata: { orderNo: existing.orderNo, status: existing.status },
  });
  await service.delete(id);

  return c.json({
    success: true,
    message: 'Order deleted successfully'
  });
});

export default ordersApp;
