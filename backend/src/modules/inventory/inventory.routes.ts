import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { InventoryService } from './inventory.service.js';
import { inventoryCreateSchema, inventoryUpdateSchema, movementCreateSchema } from './inventory.validator.js';
import { parseQueryParams } from '../../utils/query.js';
import { protect, requireWrite } from '../../middleware/protect.js';
import { audit } from '../../services/audit.service.js';
import type { AuthVariables } from '../../types/auth.js';
import type { AuthContext } from '../../middleware/auth.js';

const inventoryApp = new Hono<{ Variables: AuthVariables }>();
const service = new InventoryService();

inventoryApp.use('*', ...protect('inventory'));

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
inventoryApp.post('/', requireWrite('inventory'), zValidator('json', inventoryCreateSchema), async (c) => {
  const body = c.req.valid('json');
  const actor = c.get('appUser');
  try {
    const item = await service.create(body);
    await audit.log({
      userId: actor?.id,
      action: 'create',
      entity: 'inventory',
      entityId: item.id,
      metadata: { sku: item.sku, name: item.name },
    });
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
inventoryApp.put('/:id', requireWrite('inventory'), zValidator('json', inventoryUpdateSchema), async (c) => {
  const id = c.req.param('id') as string;
  const body = c.req.valid('json');
  const actor = c.get('appUser');

  try {
    const item = await service.update(id, body);
    await audit.log({
      userId: actor?.id,
      action: 'update',
      entity: 'inventory',
      entityId: item.id,
      metadata: { sku: item.sku, quantity: item.quantity },
    });
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
inventoryApp.delete('/:id', requireWrite('inventory'), async (c: AuthContext) => {
  const id = c.req.param('id') as string;
  const actor = c.get('appUser');
  const existing = await service.getById(id);

  if (!existing) {
    return c.json({
      success: false,
      error: 'NotFound',
      message: 'Inventory item not found',
    }, 404);
  }

  await audit.log({
    userId: actor?.id,
    action: 'delete',
    entity: 'inventory',
    entityId: id,
    metadata: { sku: existing.sku, name: existing.name },
  });
  await service.delete(id);

  return c.json({
    success: true,
    message: 'Inventory item deleted successfully'
  });
});

// Add Inventory Movement manually
inventoryApp.post('/:id/movements', requireWrite('inventory'), zValidator('json', movementCreateSchema), async (c) => {
  const id = c.req.param('id') as string;
  const body = c.req.valid('json');
  const actor = c.get('appUser');

  try {
    const movement = await service.addMovement(
      id,
      body.quantity,
      body.type,
      body.reference,
      body.notes
    );

    await audit.log({
      userId: actor?.id,
      action: 'movement',
      entity: 'inventory',
      entityId: id,
      metadata: { type: body.type, quantity: body.quantity },
    });

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
