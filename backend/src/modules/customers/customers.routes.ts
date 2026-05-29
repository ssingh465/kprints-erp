import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { CustomersService } from './customers.service.js';
import { customerCreateSchema, customerUpdateSchema } from './customers.validator.js';
import { parseQueryParams } from '../../utils/query.js';
import { protect, requireWrite } from '../../middleware/protect.js';
import { audit } from '../../services/audit.service.js';
import type { AuthVariables } from '../../types/auth.js';
import type { AuthContext } from '../../middleware/auth.js';

const customersApp = new Hono<{ Variables: AuthVariables }>();
const service = new CustomersService();

customersApp.use('*', ...protect('customers'));

// List Customers
customersApp.get('/', async (c) => {
  const params = parseQueryParams(c);
  const result = await service.list({
    search: params.search,
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

// Get Single Customer
customersApp.get('/:id', async (c) => {
  const id = c.req.param('id');
  const customer = await service.getById(id);

  if (!customer) {
    return c.json({
      success: false,
      error: 'NotFound',
      message: 'Customer not found'
    }, 404);
  }

  return c.json({
    success: true,
    data: customer
  });
});

// Create Customer
customersApp.post('/', requireWrite('customers'), zValidator('json', customerCreateSchema), async (c) => {
  const body = c.req.valid('json');
  const actor = c.get('appUser');
  const customer = await service.create(body);

  await audit.log({
    userId: actor?.id,
    action: 'create',
    entity: 'customer',
    entityId: customer.id,
    metadata: { name: customer.name },
  });

  return c.json({
    success: true,
    data: customer,
    message: 'Customer created successfully'
  }, 201);
});

// Update Customer
customersApp.put('/:id', requireWrite('customers'), zValidator('json', customerUpdateSchema), async (c) => {
  const id = c.req.param('id') as string;
  const body = c.req.valid('json');
  const actor = c.get('appUser');

  const customer = await service.update(id, body);
  await audit.log({
    userId: actor?.id,
    action: 'update',
    entity: 'customer',
    entityId: customer.id,
    metadata: { name: customer.name },
  });
  return c.json({
    success: true,
    data: customer,
    message: 'Customer updated successfully'
  });
});

// Delete Customer
customersApp.delete('/:id', requireWrite('customers'), async (c: AuthContext) => {
  const id = c.req.param('id') as string;
  const actor = c.get('appUser');
  const existing = await service.getById(id);

  if (!existing) {
    return c.json({
      success: false,
      error: 'NotFound',
      message: 'Customer not found',
    }, 404);
  }

  await audit.log({
    userId: actor?.id,
    action: 'delete',
    entity: 'customer',
    entityId: id,
    metadata: { name: existing.name },
  });
  await service.delete(id);

  return c.json({
    success: true,
    message: 'Customer deleted successfully'
  });
});

export default customersApp;
