import { Hono } from 'hono';
import { ArtworksService } from './artworks.service.js';
import { parseQueryParams } from '../../utils/query.js';
import { protect } from '../../middleware/protect.js';
import type { AuthVariables } from '../../types/auth.js';

const artworksApp = new Hono<{ Variables: AuthVariables }>();
const service = new ArtworksService();

artworksApp.use('*', ...protect('artwork-uploads'));

artworksApp.get('/', async (c) => {
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

export default artworksApp;
