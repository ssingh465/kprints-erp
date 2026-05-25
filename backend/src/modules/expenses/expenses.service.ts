import { prisma } from '../../lib/prisma.js';

export class ExpensesService {
  async list(options: { search?: string; category?: string; skip?: number; take?: number }) {
    const { search, category, skip, take } = options;
    const where: any = {};

    if (search) {
      where.OR = [
        { vendor: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (category) {
      where.category = category;
    }

    const [items, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip,
        take,
        orderBy: { date: 'desc' },
        include: {
          supplier: {
            select: {
              name: true
            }
          }
        }
      }),
      prisma.expense.count({ where })
    ]);

    return { items, total };
  }

  async create(data: {
    date: string | Date;
    category: string;
    vendor: string;
    supplierId?: string;
    amount: number;
    paymentMode: string;
    notes?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          date: new Date(data.date),
          category: data.category,
          vendor: data.vendor,
          supplierId: data.supplierId || null,
          amount: data.amount,
          paymentMode: data.paymentMode,
          notes: data.notes
        }
      });

      // If supplier is linked, optionally record the payout!
      if (data.supplierId) {
        await tx.supplier.update({
          where: { id: data.supplierId },
          data: {
            outstanding: { decrement: data.amount }
          }
        });
      }

      return expense;
    });
  }

  async delete(id: string) {
    return prisma.expense.delete({
      where: { id }
    });
  }
}
