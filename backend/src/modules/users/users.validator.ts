import { z } from 'zod';

const appRoleSchema = z.enum([
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'STAFF',
  'DESIGNER',
  'PRODUCTION_OPERATOR',
  'FINANCE',
  'VIEWER',
]);

export const inviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: appRoleSchema,
});

export const updateRoleSchema = z.object({
  role: appRoleSchema,
});

export const listUsersQuerySchema = z.object({
  search: z.string().optional(),
  role: appRoleSchema.optional(),
  status: z.enum(['pending', 'active', 'disabled', 'invited']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
