import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { InventoryService } from './inventory.service.js';
import { inventoryCreateSchema, inventoryUpdateSchema, movementCreateSchema } from './inventory.validator.js';
import { parseQueryParams } from '../../utils/query.js';

const inventoryApp = new Hono();
const service = new InventoryService();

// List Inventory
inventoryApp.get('/', async (c) => {
  const params = parseQueryParams(c);
  
  const category = c.req.query('category');
  const supplierId = c.req.query('supplierId');

  const result = await service.list({
    search: params.search,
    category,
    supplierId,
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

// Get Single Inventory Item
inventoryApp.get('/:id', async (c) => {
  const id = c.req.param('id');
  const item = await service.getById(id);

  if (!item) {
    return c.json({
      success: false,
      error: 'NotFound',
      message: 'Inventory item not found'
    }, 404);
  }

  return c.json({
    success: true,
    data: item
  });
});

// Create Inventory Item
inventoryApp.post('/', zValidator('json', inventoryCreateSchema), async (c) => {
  const body = c.req.valid('json');
  try {
    const item = await service.create(body);
    return c.json({
      success: true,
      data: item,
      message: 'Inventory item recorded successfully'
    }, 201);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return c.json({
        success: false,
        error: 'ConflictError',
        message: 'An inventory item with this SKU already exists'
      }, 409);
    }
    throw error;
  }
});

// Update Inventory Item
inventoryApp.put('/:id', zValidator('json', inventoryUpdateSchema), async (c) => {
  const id = c.req.param('id');
  const body = c.req.valid('json');

  try {
    const item = await service.update(id, body);
    return c.json({
      success: true,
      data: item,
      message: 'Inventory item updated successfully'
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: 'UpdateError',
      message: error.message
    }, 400);
  }
});

// Delete Inventory Item
inventoryApp.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await service.delete(id);

  return c.json({
    success: true,
    message: 'Inventory item deleted successfully'
  });
});

// Add Inventory Movement manually
inventoryApp.post('/:id/movements', zValidator('json', movementCreateSchema), async (c) => {
  const id = c.req.param('id');
  const body = c.req.valid('json');

  try {
    const movement = await service.addMovement(
      id,
      body.quantity,
      body.type,
      body.reference,
      body.notes
    );

    return c.json({
      success: true,
      data: movement,
      message: 'Inventory movement recorded and stock level adjusted successfully'
    }, 201);
  } catch (error: any) {
    return c.json({
      success: false,
      error: 'MovementRecordError',
      message: error.message
    }, 400);
  }
});

export default inventoryApp;
