import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { ExpensesService } from './expenses.service.js';
import { prisma } from '../../lib/prisma.js';
import { parsePeriodFromQuery, serializePeriod } from '../../utils/period.js';
import { parseQueryParams } from '../../utils/query.js';
import { protect, requireWrite } from '../../middleware/protect.js';
import { audit } from '../../services/audit.service.js';
import type { AuthVariables } from '../../types/auth.js';
import type { AuthContext } from '../../middleware/auth.js';

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
    return c.json({
      success: true,
      data: expense,
      message: 'Expense recorded successfully'
    }, 201);
  } catch (error: any) {
    return c.json({
      success: false,
      error: 'ExpenseRecordError',
      message: error.message
    }, 400);
  }
});

// Delete Expense
expensesApp.delete('/:id', requireWrite('purchases'), async (c: AuthContext) => {
  const id = c.req.param('id') as string;
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
