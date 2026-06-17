import { Hono } from 'hono';
import { ArtworksService } from './artworks.service.js';
import { parseQueryParams } from '../../utils/query.js';
import { protect, requireWrite } from '../../middleware/protect.js';
import { audit } from '../../services/audit.service.js';
import type { AuthVariables } from '../../types/auth.js';
import type { AuthContext } from '../../middleware/auth.js';

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

artworksApp.delete('/:id', requireWrite('artwork-uploads'), async (c: AuthContext) => {
  const id = c.req.param('id') as string;
  const actor = c.get('appUser');
  const existing = await service.getById(id);

  if (!existing) {
    return c.json({ success: false, error: 'NotFound', message: 'Artwork upload not found' }, 404);
  }

  await audit.log({
    userId: actor?.id,
    action: 'delete',
    entity: 'artwork',
    entityId: id,
    metadata: { fileName: existing.fileName, orderId: existing.orderId },
  });
  await service.delete(id);

  return c.json({ success: true, message: 'Artwork deleted successfully' });
});

export default artworksApp;
