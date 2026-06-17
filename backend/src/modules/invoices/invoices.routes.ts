import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { InvoicesService } from './invoices.service.js';
import { parseQueryParams } from '../../utils/query.js';
import { protect, requireWrite } from '../../middleware/protect.js';
import { audit } from '../../services/audit.service.js';
import type { AuthVariables } from '../../types/auth.js';

const invoicesApp = new Hono<{ Variables: AuthVariables }>();
const service = new InvoicesService();

invoicesApp.use('*', ...protect('finance'));

const invoiceCreateSchema = z.object({
  orderId: z.string().uuid(),
  amount: z.number().min(0).optional(),
});

invoicesApp.get('/', async (c) => {
  const params = parseQueryParams(c);
  const result = await service.list({
    search: params.search,
    skip: params.skip,
    take: params.take,
  });

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

invoicesApp.get('/:id', async (c) => {
  const invoice = await service.getById(c.req.param('id'));
  if (!invoice) {
    return c.json({ success: false, error: 'NotFound', message: 'Invoice not found' }, 404);
  }
  return c.json({ success: true, data: invoice });
});

invoicesApp.post('/', requireWrite('finance'), zValidator('json', invoiceCreateSchema), async (c) => {
  const body = c.req.valid('json');
  const actor = c.get('appUser');

  try {
    const invoice = await service.createForOrder(body.orderId, body.amount);
    await audit.log({
      userId: actor?.id,
      action: 'create',
      entity: 'invoice',
      entityId: invoice.id,
      metadata: { invoiceNo: invoice.invoiceNo, orderId: body.orderId },
    });
    return c.json({ success: true, data: invoice, message: 'Invoice created successfully' }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invoice creation failed';
    return c.json({ success: false, error: 'InvoiceCreateError', message }, 400);
  }
});

invoicesApp.delete('/:id', requireWrite('finance'), async (c) => {
  const id = c.req.param('id');
  const actor = c.get('appUser');
  const existing = await service.getById(id);

  if (!existing) {
    return c.json({ success: false, error: 'NotFound', message: 'Invoice not found' }, 404);
  }

  await audit.log({
    userId: actor?.id,
    action: 'delete',
    entity: 'invoice',
    entityId: id,
    metadata: { invoiceNo: existing.invoiceNo },
  });
  await service.delete(id);

  return c.json({ success: true, message: 'Invoice deleted successfully' });
});

export default invoicesApp;
