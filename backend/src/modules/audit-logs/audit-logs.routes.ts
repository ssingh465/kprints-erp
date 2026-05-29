import { Hono } from 'hono';
import { AuditLogsService } from './audit-logs.service.js';
import { parseQueryParams } from '../../utils/query.js';
import { protect } from '../../middleware/protect.js';
import { requireRole } from '../../middleware/auth.js';
import type { AuthVariables } from '../../types/auth.js';

const auditLogsApp = new Hono<{ Variables: AuthVariables }>();
const service = new AuditLogsService();

auditLogsApp.use('*', ...protect('admin/users'), requireRole('SUPER_ADMIN'));

auditLogsApp.get('/', async (c) => {
  const params = parseQueryParams(c);
  const query = c.req.query();

  const from = query.from ? new Date(query.from) : undefined;
  const to = query.to ? new Date(query.to) : undefined;

  const result = await service.list({
    entity: query.entity || undefined,
    action: query.action || undefined,
    userId: query.userId || undefined,
    from: from && !Number.isNaN(from.getTime()) ? from : undefined,
    to: to && !Number.isNaN(to.getTime()) ? to : undefined,
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

export default auditLogsApp;
