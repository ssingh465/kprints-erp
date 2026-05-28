import { z } from 'zod';

export const customerCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(8, 'Phone number must be at least 8 characters'),
  email: z.string().email('Invalid email address'),
  city: z.string().min(2, 'City must be at least 2 characters'),
  source: z.enum(['Offline', 'Website', 'Marketplace'], {
    errorMap: () => ({ message: 'Source must be Offline, Website, or Marketplace' })
  }),
  lifetimeValue: z.number().min(0).optional(),
  orderCount: z.number().int().min(0).optional()
});

export const customerUpdateSchema = customerCreateSchema.partial();
