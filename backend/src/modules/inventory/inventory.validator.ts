import { z } from 'zod';

export const inventoryCreateSchema = z.object({
  sku: z.string().min(3, 'SKU must be at least 3 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  category: z.enum([
    'Poster Stock',
    'Paper Rolls',
    'Ink',
    'Frames',
    'Lamination Sheets',
    'Packaging Material',
    'Accessories'
  ], {
    errorMap: () => ({ message: 'Invalid material category' })
  }),
  supplierId: z.string().uuid('Invalid supplier reference (UUID expected)'),
  unit: z.string().min(1, 'Unit is required (e.g. roll, piece, bottle)'),
  quantity: z.number().min(0, 'Quantity cannot be negative'),
  reorderLevel: z.number().min(0, 'Reorder level cannot be negative'),
  unitCost: z.number().min(0, 'Unit cost cannot be negative'),
  lastMovement: z.string().optional()
});

export const inventoryUpdateSchema = inventoryCreateSchema.partial();

export const movementCreateSchema = z.object({
  quantity: z.number({ required_error: 'Movement quantity is required' }),
  type: z.enum(['Purchase', 'Consumption', 'Adjustment'], {
    errorMap: () => ({ message: 'Type must be Purchase, Consumption, or Adjustment' })
  }),
  reference: z.string().optional(),
  notes: z.string().optional()
});
