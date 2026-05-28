import { prisma } from '../../lib/prisma.js';

export class InventoryService {
  async list(options: {
    search?: string;
    category?: string;
    supplierId?: string;
    skip?: number;
    take?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { search, category, supplierId, skip, take, sortBy, sortOrder } = options;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (category) {
      where.category = category;
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
        include: {
          supplier: {
            select: {
              name: true
            }
          }
        }
      }),
      prisma.inventoryItem.count({ where })
    ]);

    return { items, total };
  }

  async getById(id: string) {
    return prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        supplier: true,
        movements: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });
  }

  async create(data: {
    sku: string;
    name: string;
    category: string;
    supplierId: string;
    unit: string;
    quantity: number;
    reorderLevel: number;
    unitCost: number;
    lastMovement?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.create({
        data: {
          sku: data.sku,
          name: data.name,
          category: data.category,
          supplierId: data.supplierId,
          unit: data.unit,
          quantity: data.quantity,
          reorderLevel: data.reorderLevel,
          unitCost: data.unitCost,
          lastMovement: data.lastMovement || 'Initial stock entry'
        }
      });

      if (data.quantity > 0) {
        await tx.inventoryMovement.create({
          data: {
            inventoryItemId: item.id,
            quantity: data.quantity,
            type: 'Adjustment',
            notes: 'Initial stock entry'
          }
        });
      }

      return item;
    });
  }

  async update(
    id: string,
    data: Partial<{
      sku: string;
      name: string;
      category: string;
      supplierId: string;
      unit: string;
      quantity: number;
      reorderLevel: number;
      unitCost: number;
      lastMovement: string;
    }>
  ) {
    return prisma.$transaction(async (tx) => {
      const current = await tx.inventoryItem.findUnique({ where: { id } });
      if (!current) {
        throw new Error('Inventory item not found');
      }

      const item = await tx.inventoryItem.update({
        where: { id },
        data: {
          ...data,
          lastMovement: data.quantity !== undefined && data.quantity !== current.quantity 
            ? `Stock updated from ${current.quantity} to ${data.quantity}` 
            : data.lastMovement
        }
      });

      if (data.quantity !== undefined && data.quantity !== current.quantity) {
        const diff = data.quantity - current.quantity;
        await tx.inventoryMovement.create({
          data: {
            inventoryItemId: item.id,
            quantity: diff,
            type: diff > 0 ? 'Purchase' : 'Consumption',
            notes: data.lastMovement || `Manual stock update (${current.quantity} -> ${data.quantity})`
          }
        });
      }

      return item;
    });
  }

  async delete(id: string) {
    return prisma.inventoryItem.delete({
      where: { id }
    });
  }

  async addMovement(itemId: string, quantity: number, type: 'Purchase' | 'Consumption' | 'Adjustment', reference?: string, notes?: string) {
    return prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({ where: { id: itemId } });
      if (!item) {
        throw new Error('Inventory item not found');
      }

      const newQty = item.quantity + quantity;
      
      const movement = await tx.inventoryMovement.create({
        data: {
          inventoryItemId: itemId,
          quantity,
          type,
          reference,
          notes
        }
      });

      await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          quantity: newQty,
          lastMovement: notes || `${type} of ${Math.abs(quantity)} ${item.unit}s`
        }
      });

      return movement;
    });
  }
}
