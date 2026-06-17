import { prisma } from '../../lib/prisma.js';
import type { Prisma } from '@prisma/client';

export class CouponsService {
  async list(options: { search?: string; skip?: number; take?: number }) {
    const { search, skip, take } = options;
    const where: Prisma.CouponWhereInput = {};

    if (search) {
      where.code = { contains: search, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      prisma.coupon.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.coupon.count({ where }),
    ]);

    return { items, total };
  }

  async create(data: { code: string; discount: number; active?: boolean }) {
    return prisma.coupon.create({
      data: {
        code: data.code.toUpperCase(),
        discount: data.discount,
        active: data.active ?? true,
      },
    });
  }

  async update(id: string, data: Partial<{ code: string; discount: number; active: boolean }>) {
    return prisma.coupon.update({
      where: { id },
      data: data.code ? { ...data, code: data.code.toUpperCase() } : data,
    });
  }

  async delete(id: string) {
    return prisma.coupon.delete({ where: { id } });
  }
}
