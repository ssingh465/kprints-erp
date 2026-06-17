import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { ExpensesService } from './expenses.service.js';
import { prisma } from '../../lib/prisma.js';
import { parsePeriodFromQuery, serializePeriod } from '../../utils/period.js';
import { parseQueryParams } from '../../utils/query.js';
import { protect, requireWrite } from '../../middleware/protect.js';
import { audit } from '../../services/audit.service.js';
import { replayIdempotentResponse, storeIdempotentResponse } from '../../utils/idempotency.js';
import type { AuthVariables } from '../../types/auth.js';

const expensesApp = new Hono<{ Variables: AuthVariables }>();
const service = new ExpensesService();

expensesApp.use('*', ...protect('purchases'));

const expenseCreateSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  category: z.string().min(2, 'Category must be at least 2 characters'),
  vendor: z.string().min(2, 'Vendor must be at least 2 characters'),
  supplierId: z.string().uuid().optional().nullable(),
  amount: z.number().min(0, 'Amount must be greater than or equal to 0'),
  paymentMode: z.enum(['Cash', 'UPI', 'Card', 'Bank Transfer'], {
    errorMap: () => ({ message: 'Invalid payment mode' })
  }),
  notes: z.string().optional()
});

const expenseUpdateSchema = expenseCreateSchema.partial();

// List Expenses
expensesApp.get('/', async (c) => {
  const params = parseQueryParams(c);
  const category = c.req.query('category');
  const periodQuery = c.req.query('period');
  const period = periodQuery ? parsePeriodFromQuery(c.req.query()) : undefined;

  const result = await service.list({
    search: params.search,
    category: category || undefined,
    skip: params.skip,
    take: params.take,
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

// Create Expense
expensesApp.post('/', requireWrite('purchases'), zValidator('json', expenseCreateSchema), async (c) => {
  const body = c.req.valid('json');
  const actor = c.get('appUser');
  const idempotencyKey = c.req.header('Idempotency-Key');

  const replay = await replayIdempotentResponse(idempotencyKey);
  if (replay) {
    c.header('Idempotency-Replayed', 'true');
    return c.json(replay.body, replay.statusCode as 201);
  }

  try {
    const expense = await service.create({
      ...body,
      supplierId: body.supplierId || undefined
    });
    await audit.log({
      userId: actor?.id,
      action: 'create',
      entity: 'expense',
      entityId: expense.id,
      metadata: { vendor: expense.vendor, amount: expense.amount },
    });
    const payload = {
      success: true,
      data: expense,
      message: 'Expense recorded successfully'
    };
    await storeIdempotentResponse(idempotencyKey, c.req.method, c.req.path, 201, payload);
    return c.json(payload, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Expense record failed';
    return c.json({
      success: false,
      error: 'ExpenseRecordError',
      message
    }, 400);
  }
});

// Update Expense
expensesApp.put('/:id', requireWrite('purchases'), zValidator('json', expenseUpdateSchema), async (c) => {
  const id = c.req.param('id') as string;
  const body = c.req.valid('json');
  const actor = c.get('appUser');

  try {
    const expense = await service.update(id, {
      ...body,
      supplierId: body.supplierId === undefined ? undefined : body.supplierId,
    });
    await audit.log({
      userId: actor?.id,
      action: 'update',
      entity: 'expense',
      entityId: expense.id,
      metadata: { vendor: expense.vendor, amount: expense.amount },
    });
    return c.json({
      success: true,
      data: expense,
      message: 'Expense updated successfully',
    });
  } catch (error: any) {
    if (error.message === 'Expense not found') {
      return c.json({
        success: false,
        error: 'NotFound',
        message: 'Expense not found',
      }, 404);
    }
    return c.json({
      success: false,
      error: 'ExpenseUpdateError',
      message: error.message,
    }, 400);
  }
});

// Delete Expense
expensesApp.delete('/:id', requireWrite('purchases'), async (c) => {
  const id = c.req.param('id');
  const actor = c.get('appUser');
  const existing = await prisma.expense.findUnique({ where: { id } });

  if (!existing) {
    return c.json({
      success: false,
      error: 'NotFound',
      message: 'Expense not found',
    }, 404);
  }

  await audit.log({
    userId: actor?.id,
    action: 'delete',
    entity: 'expense',
    entityId: id,
    metadata: { vendor: existing.vendor, amount: existing.amount },
  });
  await service.delete(id);

  return c.json({
    success: true,
    message: 'Expense deleted successfully'
  });
});

export default expensesApp;
