import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { ProductionService } from './production.service.js';
import { parseQueryParams } from '../../utils/query.js';
import { protect, requireWrite } from '../../middleware/protect.js';
import type { AuthVariables } from '../../types/auth.js';

const productionApp = new Hono<{ Variables: AuthVariables }>();
const service = new ProductionService();

productionApp.use('*', ...protect('production'));

// Validation Schemas
const stageUpdateSchema = z.object({
  stage: z.enum([
    'Draft',
    'Design Pending',
    'Design Approved',
    'Printing Queued',
    'Printing In Progress',
    'Lamination',
    'Framing',
    'Packaging',
    'Ready for Pickup',
    'Ready for Shipping',
    'Delivered',
    'Cancelled'
  ], {
    errorMap: () => ({ message: 'Invalid order/production stage' })
  })
});

const operatorAssignSchema = z.object({
  operator: z.string().min(2, 'Operator name must be at least 2 characters'),
  estimatedCompletion: z.string().optional()
});

// List Production Jobs
productionApp.get('/', async (c) => {
  const params = parseQueryParams(c);
  const stage = c.req.query('stage');
  const priority = c.req.query('priority');

  const result = await service.list({
    search: params.search,
    stage: stage || undefined,
    priority: priority || undefined,
    skip: params.skip,
    take: params.take,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder
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

// Get Single Production Job
productionApp.get('/:id', async (c) => {
  const id = c.req.param('id');
  const job = await service.getById(id);

  if (!job) {
    return c.json({
      success: false,
      error: 'NotFound',
      message: 'Production job not found'
    }, 404);
  }

  return c.json({
    success: true,
    data: job
  });
});

// Update Job Kanban Stage (updates underlying Order status automatically)
productionApp.put('/:id/stage', requireWrite('production'), zValidator('json', stageUpdateSchema), async (c) => {
  const id = c.req.param('id');
  const body = c.req.valid('json');

  try {
    const job = await service.updateStage(id, body.stage);
    return c.json({
      success: true,
      data: job,
      message: `Production job stage and order status successfully moved to: ${body.stage}`
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: 'StageUpdateError',
      message: error.message
    }, 400);
  }
});

// Assign Operator & Completion Target
productionApp.put('/:id/operator', requireWrite('production'), zValidator('json', operatorAssignSchema), async (c) => {
  const id = c.req.param('id');
  const body = c.req.valid('json');

  try {
    const job = await service.assignOperator(id, body.operator, body.estimatedCompletion);
    return c.json({
      success: true,
      data: job,
      message: 'Operator assigned successfully'
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: 'OperatorAssignError',
      message: error.message
    }, 400);
  }
});

export default productionApp;
