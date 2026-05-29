import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { CouponsService } from './coupons.service.js';
import { parseQueryParams } from '../../utils/query.js';
import { protect, requireWrite } from '../../middleware/protect.js';
import type { AuthVariables } from '../../types/auth.js';

const couponsApp = new Hono<{ Variables: AuthVariables }>();
const service = new CouponsService();

couponsApp.use('*', ...protect('coupons'));

const couponSchema = z.object({
  code: z.string().min(3),
  discount: z.number().min(1).max(100),
  active: z.boolean().optional(),
});

couponsApp.get('/', async (c) => {
  const params = parseQueryParams(c);
  const result = await service.list({ search: params.search, skip: params.skip, take: params.take });
  return c.json({
    success: true,
    data: result.items,
    pagination: {
      page: params.page,
      limit: params.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / params.limit),
    },
  });
});

couponsApp.post('/', requireWrite('coupons'), zValidator('json', couponSchema), async (c) => {
  const body = c.req.valid('json');
  const coupon = await service.create(body);
  return c.json({ success: true, data: coupon, message: 'Coupon created successfully' }, 201);
});

couponsApp.put('/:id', requireWrite('coupons'), zValidator('json', couponSchema.partial()), async (c) => {
  const id = c.req.param('id');
  const body = c.req.valid('json');
  const coupon = await service.update(id, body);
  return c.json({ success: true, data: coupon, message: 'Coupon updated successfully' });
});

couponsApp.delete('/:id', requireWrite('coupons'), async (c) => {
  const id = c.req.param('id');
  await service.delete(id);
  return c.json({ success: true, message: 'Coupon deleted successfully' });
});

export default couponsApp;
