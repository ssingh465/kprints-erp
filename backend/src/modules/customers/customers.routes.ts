import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { CustomersService } from './customers.service.js';
import { customerCreateSchema, customerUpdateSchema } from './customers.validator.js';
import { parseQueryParams } from '../../utils/query.js';

const customersApp = new Hono();
const service = new CustomersService();

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
customersApp.post('/', zValidator('json', customerCreateSchema), async (c) => {
  const body = c.req.valid('json');
  const customer = await service.create(body);

  return c.json({
    success: true,
    data: customer,
    message: 'Customer created successfully'
  }, 201);
});

// Update Customer
customersApp.put('/:id', zValidator('json', customerUpdateSchema), async (c) => {
  const id = c.req.param('id');
  const body = c.req.valid('json');

  const customer = await service.update(id, body);
  return c.json({
    success: true,
    data: customer,
    message: 'Customer updated successfully'
  });
});

// Delete Customer
customersApp.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await service.delete(id);

  return c.json({
    success: true,
    message: 'Customer deleted successfully'
  });
});

export default customersApp;
