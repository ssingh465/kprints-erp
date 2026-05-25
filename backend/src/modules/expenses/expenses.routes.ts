import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { ExpensesService } from './expenses.service.js';
import { parseQueryParams } from '../../utils/query.js';

const expensesApp = new Hono();
const service = new ExpensesService();

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

  const result = await service.list({
    search: params.search,
    category: category || undefined,
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

// Create Expense
expensesApp.post('/', zValidator('json', expenseCreateSchema), async (c) => {
  const body = c.req.valid('json');
  try {
    const expense = await service.create({
      ...body,
      supplierId: body.supplierId || undefined
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
expensesApp.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await service.delete(id);

  return c.json({
    success: true,
    message: 'Expense deleted successfully'
  });
});

export default expensesApp;
