import { prisma } from '../../lib/prisma.js';

export class AuditLogsService {
  async list(options: {
    entity?: string;
    action?: string;
    userId?: string;
    from?: Date;
    to?: Date;
    skip?: number;
    take?: number;
  }) {
    const { entity, action, userId, from, to, skip, take } = options;

    const where: {
      entity?: string;
      action?: string;
      userId?: string;
      createdAt?: { gte?: Date; lte?: Date };
    } = {};

    if (entity) where.entity = entity;
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, fullName: true, initials: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { items, total };
  }
}
