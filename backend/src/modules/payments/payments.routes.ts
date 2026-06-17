import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { PaymentsService } from './payments.service.js';
import { protect, requireWrite } from '../../middleware/protect.js';
import { audit } from '../../services/audit.service.js';
import { replayIdempotentResponse, storeIdempotentResponse } from '../../utils/idempotency.js';
import type { AuthVariables } from '../../types/auth.js';

const app = new Hono<{ Variables: AuthVariables }>();
const service = new PaymentsService();

const paymentSchema = z.object({
  amount: z.number().positive(),
  receivedAt: z.string().optional(),
  paidAt: z.string().optional(),
  method: z.enum(['Cash', 'UPI', 'Card', 'Bank Transfer']),
  notes: z.string().optional(),
});

app.use('*', ...protect('finance'));

app.get('/orders/:orderId', async (c) => {
  const payments = await service.listOrderPayments(c.req.param('orderId'));
  return c.json({ success: true, data: payments });
});

app.post('/orders/:orderId', requireWrite('finance'), zValidator('json', paymentSchema), async (c) => {
  const body = c.req.valid('json');
  const actor = c.get('appUser');
  const idempotencyKey = c.req.header('Idempotency-Key');
  const replay = await replayIdempotentResponse(idempotencyKey);
  if (replay) {
    c.header('Idempotency-Replayed', 'true');
    return c.json(replay.body, replay.statusCode as 201);
  }

  try {
    const payment = await service.recordOrderPayment({
      orderId: c.req.param('orderId'),
      amount: body.amount,
      receivedAt: body.receivedAt ?? new Date().toISOString(),
      method: body.method,
      notes: body.notes,
    });
    await audit.log({
      userId: actor?.id,
      action: 'payment',
      entity: 'order',
      entityId: c.req.param('orderId'),
      metadata: { amount: body.amount, method: body.method },
    });
    const payload = { success: true, data: payment, message: 'Payment recorded' };
    await storeIdempotentResponse(idempotencyKey, c.req.method, c.req.path, 201, payload);
    return c.json(payload, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Payment failed';
    return c.json({ success: false, error: 'OrderPaymentError', message }, 400);
  }
});

app.get('/suppliers/:supplierId', async (c) => {
  const payments = await service.listSupplierPayments(c.req.param('supplierId'));
  return c.json({ success: true, data: payments });
});

app.post('/suppliers/:supplierId', requireWrite('finance'), zValidator('json', paymentSchema), async (c) => {
  const body = c.req.valid('json');
  const actor = c.get('appUser');
  const idempotencyKey = c.req.header('Idempotency-Key');
  const replay = await replayIdempotentResponse(idempotencyKey);
  if (replay) {
    c.header('Idempotency-Replayed', 'true');
    return c.json(replay.body, replay.statusCode as 201);
  }

  try {
    const payment = await service.recordSupplierPayment({
      supplierId: c.req.param('supplierId'),
      amount: body.amount,
      paidAt: body.paidAt ?? new Date().toISOString(),
      method: body.method,
      notes: body.notes,
    });
    await audit.log({
      userId: actor?.id,
      action: 'payment',
      entity: 'supplier',
      entityId: c.req.param('supplierId'),
      metadata: { amount: body.amount, method: body.method },
    });
    const payload = { success: true, data: payment, message: 'Supplier payment recorded' };
    await storeIdempotentResponse(idempotencyKey, c.req.method, c.req.path, 201, payload);
    return c.json(payload, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Payment failed';
    return c.json({ success: false, error: 'SupplierPaymentError', message }, 400);
  }
});

export default app;
