import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { UsersService } from './users.service.js';
import { inviteUserSchema, updateRoleSchema } from './users.validator.js';
import { parseQueryParams } from '../../utils/query.js';
import { protect, requireWrite } from '../../middleware/protect.js';
import type { AuthVariables } from '../../types/auth.js';
import type { AuthContext } from '../../middleware/auth.js';
import type { AppRole } from '@prisma/client';

const usersApp = new Hono<{ Variables: AuthVariables }>();
const service = new UsersService();

usersApp.use('*', ...protect('admin/users'));

usersApp.get('/', async (c) => {
  const params = parseQueryParams(c);
  const query = c.req.query();
  const status = query.status as 'pending' | 'active' | 'disabled' | 'invited' | undefined;
  const role = query.role as AppRole | undefined;

  const result = await service.listUsers({
    search: params.search,
    role,
    status,
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

usersApp.get('/:id', async (c) => {
  const id = c.req.param('id');
  const user = await service.getById(id);

  if (!user) {
    return c.json({ success: false, error: 'NotFound', message: 'User not found' }, 404);
  }

  return c.json({ success: true, data: user });
});

usersApp.patch('/:id/approve', requireWrite('admin/users'), async (c: AuthContext) => {
  const id = c.req.param('id') as string;
  const actor = c.get('appUser')!;

  try {
    const user = await service.approve(id, actor.id);
    return c.json({ success: true, data: user, message: 'User approved successfully' });
  } catch {
    return c.json({ success: false, error: 'NotFound', message: 'User not found' }, 404);
  }
});

usersApp.patch('/:id/deactivate', requireWrite('admin/users'), async (c: AuthContext) => {
  const id = c.req.param('id') as string;
  const actor = c.get('appUser')!;

  if (id === actor.id) {
    return c.json(
      { success: false, error: 'Forbidden', message: 'You cannot deactivate your own account.' },
      403
    );
  }

  try {
    const user = await service.deactivate(id, actor.id);
    return c.json({ success: true, data: user, message: 'User deactivated successfully' });
  } catch {
    return c.json({ success: false, error: 'NotFound', message: 'User not found' }, 404);
  }
});

usersApp.patch(
  '/:id/role',
  requireWrite('admin/users'),
  zValidator('json', updateRoleSchema),
  async (c) => {
    const id = c.req.param('id') as string;
    const { role } = c.req.valid('json');
    const actor = c.get('appUser')!;

    if (id === actor.id) {
      return c.json(
        { success: false, error: 'Forbidden', message: 'You cannot change your own role.' },
        403
      );
    }

    try {
      const user = await service.updateRole(id, role, actor.id);
      return c.json({ success: true, data: user, message: 'Role updated successfully' });
    } catch {
      return c.json({ success: false, error: 'NotFound', message: 'User not found' }, 404);
    }
  }
);

export default usersApp;
