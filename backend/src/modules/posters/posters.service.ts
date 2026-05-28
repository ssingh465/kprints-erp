import { prisma } from '../../lib/prisma.js';
import { ResolvedPeriod } from '../../utils/period.js';
import { applyPosterSales, getPosterSalesInPeriod } from '../../utils/poster-sales.js';

export class PostersService {
  async list(options: {
    search?: string;
    category?: string;
    active?: boolean;
    skip?: number;
    take?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    period?: ResolvedPeriod;
  }) {
    const { search, category, active, skip, take, sortBy, sortOrder, period } = options;

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
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
        orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
      }),
      prisma.poster.count({ where }),
    ]);

    if (!period) {
      return { items, total };
    }

    const sales = await getPosterSalesInPeriod(period);
    return {
      items: applyPosterSales(items, sales),
      total,
    };
  }

  async getTopSelling(period: ResolvedPeriod, limit = 4) {
    const sales = await getPosterSalesInPeriod(period);
    const posters = await prisma.poster.findMany();
    return applyPosterSales(posters, sales)
      .sort((a, b) => b.soldThisMonth - a.soldThisMonth)
      .slice(0, limit);
  }

  async getById(id: string) {
    return prisma.poster.findUnique({
      where: { id },
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
        active: data.active ?? true,
      },
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
      data,
    });
  }

  async delete(id: string) {
    return prisma.poster.delete({
      where: { id },
    });
  }
}
