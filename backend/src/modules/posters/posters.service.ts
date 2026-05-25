import { prisma } from '../../lib/prisma.js';

export class PostersService {
  async list(options: {
    search?: string;
    category?: string;
    active?: boolean;
    skip?: number;
    take?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { search, category, active, skip, take, sortBy, sortOrder } = options;

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (category) {
      where.category = { equals: category, mode: 'insensitive' };
    }

    if (active !== undefined) {
      where.active = active;
    }

    const [items, total] = await Promise.all([
      prisma.poster.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' }
      }),
      prisma.poster.count({ where })
    ]);

    return { items, total };
  }

  async getById(id: string) {
    return prisma.poster.findUnique({
      where: { id }
    });
  }

  async create(data: {
    sku: string;
    title: string;
    category: string;
    tags: string[];
    size: string;
    price: number;
    stock?: number;
    soldThisMonth?: number;
    active?: boolean;
  }) {
    return prisma.poster.create({
      data: {
        sku: data.sku,
        title: data.title,
        category: data.category,
        tags: data.tags,
        size: data.size,
        price: data.price,
        stock: data.stock ?? 0,
        soldThisMonth: data.soldThisMonth ?? 0,
        active: data.active ?? true
      }
    });
  }

  async update(
    id: string,
    data: Partial<{
      sku: string;
      title: string;
      category: string;
      tags: string[];
      size: string;
      price: number;
      stock: number;
      soldThisMonth: number;
      active: boolean;
    }>
  ) {
    return prisma.poster.update({
      where: { id },
      data
    });
  }

  async delete(id: string) {
    return prisma.poster.delete({
      where: { id }
    });
  }
}
