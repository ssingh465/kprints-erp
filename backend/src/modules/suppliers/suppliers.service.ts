import { prisma } from '../../lib/prisma.js';

export class SuppliersService {
  async list(options: { search?: string; skip?: number; take?: number }) {
    const { search, skip, take } = options;
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contact: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.supplier.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.supplier.count({ where }),
    ]);

    return { items, total };
  }

  async create(data: {
    name: string;
    contact: string;
    phone: string;
    category: string;
    outstanding?: number;
  }) {
    return prisma.supplier.create({
      data: {
        name: data.name,
        contact: data.contact,
        phone: data.phone,
        category: data.category,
        outstanding: data.outstanding ?? 0,
      },
    });
  }

  async update(
    id: string,
    data: Partial<{ name: string; contact: string; phone: string; category: string; outstanding: number }>,
  ) {
    return prisma.supplier.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.supplier.delete({ where: { id } });
  }
}
