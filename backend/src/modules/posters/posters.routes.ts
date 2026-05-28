import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { PostersService } from './posters.service.js';
import { posterCreateSchema, posterUpdateSchema } from './posters.validator.js';
import { parsePeriodFromQuery, serializePeriod } from '../../utils/period.js';
import { parseQueryParams } from '../../utils/query.js';

const postersApp = new Hono();
const service = new PostersService();

// List Posters
postersApp.get('/', async (c) => {
  const params = parseQueryParams(c);
  
  const category = c.req.query('category');
  const activeParam = c.req.query('active');
  const active = activeParam !== undefined ? activeParam === 'true' : undefined;
  const periodQuery = c.req.query('period');
  const period = periodQuery ? parsePeriodFromQuery(c.req.query()) : undefined;

  const result = await service.list({
    search: params.search,
    category,
    active,
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

// Get Single Poster
postersApp.get('/:id', async (c) => {
  const id = c.req.param('id');
  const poster = await service.getById(id);

  if (!poster) {
    return c.json({
      success: false,
      error: 'NotFound',
      message: 'Poster not found'
    }, 404);
  }

  return c.json({
    success: true,
    data: poster
  });
});

// Create Poster
postersApp.post('/', zValidator('json', posterCreateSchema), async (c) => {
  const body = c.req.valid('json');
  try {
    const poster = await service.create(body);
    return c.json({
      success: true,
      data: poster,
      message: 'Poster added to catalog successfully'
    }, 201);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return c.json({
        success: false,
        error: 'ConflictError',
        message: 'A poster with this SKU already exists'
      }, 409);
    }
    throw error;
  }
});

// Update Poster
postersApp.put('/:id', zValidator('json', posterUpdateSchema), async (c) => {
  const id = c.req.param('id');
  const body = c.req.valid('json');

  const poster = await service.update(id, body);
  return c.json({
    success: true,
    data: poster,
    message: 'Poster updated successfully'
  });
});

// Delete Poster
postersApp.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await service.delete(id);

  return c.json({
    success: true,
    message: 'Poster deleted from catalog successfully'
  });
});

export default postersApp;
