import { z } from 'zod';

export const posterCreateSchema = z.object({
  sku: z.string().min(3, 'SKU must be at least 3 characters'),
  title: z.string().min(2, 'Title must be at least 2 characters'),
  category: z.string().min(2, 'Category must be at least 2 characters'),
  tags: z.array(z.string()).default([]),
  size: z.string().min(1, 'Size is required'),
  price: z.number().min(0, 'Price must be greater than or equal to 0'),
  stock: z.number().int().min(0).optional(),
  soldThisMonth: z.number().int().min(0).optional(),
  active: z.boolean().default(true).optional()
});

export const posterUpdateSchema = posterCreateSchema.partial();
