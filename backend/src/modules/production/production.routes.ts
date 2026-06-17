import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { ProductionService } from './production.service.js';
import { PRODUCTION_JOB_STAGES } from '../../constants/stages.js';
import { parseQueryParams } from '../../utils/query.js';
import { protect, requireWrite } from '../../middleware/protect.js';
import { audit } from '../../services/audit.service.js';
import type { AuthVariables } from '../../types/auth.js';

const productionApp = new Hono<{ Variables: AuthVariables }>();
const service = new ProductionService();

productionApp.use('*', ...protect('production'));

// Validation Schemas
const stageUpdateSchema = z.object({
  stage: z.enum(PRODUCTION_JOB_STAGES, {
    errorMap: () => ({ message: 'Invalid order/production stage' }),
  }),
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
  const actor = c.get('appUser');
  const before = await service.getById(id);

  try {
    const job = await service.updateStage(id, body.stage);
    await audit.log({
      userId: actor?.id,
      action: 'stage_change',
      entity: 'production',
      entityId: job.id,
      metadata: {
        jobNo: job.jobNo,
        fromStage: before?.stage,
        toStage: body.stage,
      },
    });
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
  const actor = c.get('appUser');

  try {
    const job = await service.assignOperator(id, body.operator, body.estimatedCompletion);
    await audit.log({
      userId: actor?.id,
      action: 'operator_assign',
      entity: 'production',
      entityId: job.id,
      metadata: { jobNo: job.jobNo, operator: body.operator },
    });
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
