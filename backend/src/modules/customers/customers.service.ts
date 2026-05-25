import { prisma } from '../../lib/prisma.js';

export class CustomersService {
  async list(options: { search?: string; skip?: number; take?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }) {
    const { search, skip, take, sortBy, sortOrder } = options;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' }
      }),
      prisma.customer.count({ where })
    ]);

    return { items, total };
  }

  async getById(id: string) {
    return prisma.customer.findUnique({
      where: { id }
    });
  }

  async create(data: { name: string; phone: string; email: string; city: string; source: string; lifetimeValue?: number; orderCount?: number }) {
    return prisma.customer.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        city: data.city,
        source: data.source,
        lifetimeValue: data.lifetimeValue ?? 0,
        orderCount: data.orderCount ?? 0
      }
    });
  }

  async update(id: string, data: Partial<{ name: string; phone: string; email: string; city: string; source: string; lifetimeValue: number; orderCount: number }>) {
    return prisma.customer.update({
      where: { id },
      data
    });
  }

  async delete(id: string) {
    return prisma.customer.delete({
      where: { id }
    });
  }
}
