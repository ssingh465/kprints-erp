import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { SuppliersService } from './suppliers.service.js';
import { parseQueryParams } from '../../utils/query.js';

const suppliersApp = new Hono();
const service = new SuppliersService();

const supplierSchema = z.object({
  name: z.string().min(2),
  contact: z.string().min(2),
  phone: z.string().min(6),
  category: z.string().min(2),
  outstanding: z.number().min(0).optional(),
});

suppliersApp.get('/', async (c) => {
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

suppliersApp.post('/', zValidator('json', supplierSchema), async (c) => {
  const body = c.req.valid('json');
  const supplier = await service.create(body);
  return c.json({ success: true, data: supplier, message: 'Supplier created successfully' }, 201);
});

suppliersApp.put('/:id', zValidator('json', supplierSchema.partial()), async (c) => {
  const id = c.req.param('id');
  const body = c.req.valid('json');
  const supplier = await service.update(id, body);
  return c.json({ success: true, data: supplier, message: 'Supplier updated successfully' });
});

suppliersApp.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await service.delete(id);
  return c.json({ success: true, message: 'Supplier deleted successfully' });
});

export default suppliersApp;
