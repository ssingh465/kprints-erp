import { z } from 'zod';

export const orderLineSchema = z.object({
  posterId: z.string().uuid().optional().nullable(),
  description: z.string().min(1, 'Line description is required'),
  size: z.string().min(1, 'Size is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  framing: z.string().default('No frame')
});

export const orderCreateSchema = z.object({
  customerId: z.string().uuid('Invalid customer reference (UUID expected)'),
  type: z.enum(['Ready-made', 'Custom Design', 'Personalized'], {
    errorMap: () => ({ message: 'Type must be Ready-made, Custom Design, or Personalized' })
  }),
  channel: z.enum(['Offline', 'Website', 'Marketplace'], {
    errorMap: () => ({ message: 'Channel must be Offline, Website, or Marketplace' })
  }),
  status: z.enum([
    'Draft',
    'Design Pending',
    'Design Approved',
    'Printing Queued',
    'Printing In Progress',
    'Lamination',
    'Framing',
    'Packaging',
    'Ready for Pickup',
    'Ready for Shipping',
    'Delivered',
    'Cancelled'
  ]).default('Draft').optional(),
  priority: z.enum(['Normal', 'High', 'Rush']).default('Normal').optional(),
  dueDate: z.string().min(1, 'Due date is required'),
  total: z.number().min(0, 'Total cannot be negative'),
  paid: z.number().min(0, 'Paid cannot be negative').default(0).optional(),
  couponCode: z.string().min(2).optional(),
  lines: z.array(orderLineSchema).min(1, 'An order must contain at least one line item')
});

export const orderUpdateSchema = z.object({
  status: z.enum([
    'Draft',
    'Design Pending',
    'Design Approved',
    'Printing Queued',
    'Printing In Progress',
    'Lamination',
    'Framing',
    'Packaging',
    'Ready for Pickup',
    'Ready for Shipping',
    'Delivered',
    'Cancelled'
  ]).optional(),
  priority: z.enum(['Normal', 'High', 'Rush']).optional(),
  total: z.number().min(0).optional(),
  paid: z.number().min(0).optional(),
  dueDate: z.string().optional()
});
