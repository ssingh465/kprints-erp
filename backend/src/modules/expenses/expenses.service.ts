import { prisma } from '../../lib/prisma.js';
import { dateInPeriod, ResolvedPeriod } from '../../utils/period.js';
import type { Prisma } from '@prisma/client';

export class ExpensesService {
  async list(options: {
    search?: string;
    category?: string;
    skip?: number;
    take?: number;
    period?: ResolvedPeriod;
  }) {
    const { search, category, skip, take, period } = options;
    const where: Prisma.ExpenseWhereInput = {};

    if (period) {
      Object.assign(where, dateInPeriod(period));
    }

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
    return prisma.$transaction(async (tx) => {
      const expense = await tx.expense.findUnique({ where: { id } });
      if (!expense) {
        throw new Error('Expense not found');
      }

      if (expense.supplierId) {
        await tx.supplier.update({
          where: { id: expense.supplierId },
          data: {
            outstanding: { increment: expense.amount },
          },
        });
      }

      return tx.expense.delete({ where: { id } });
    });
  }

  async update(
    id: string,
    data: Partial<{
      date: string | Date;
      category: string;
      vendor: string;
      supplierId?: string | null;
      amount: number;
      paymentMode: string;
      notes?: string;
    }>
  ) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.expense.findUnique({ where: { id } });
      if (!existing) {
        throw new Error('Expense not found');
      }

      if (existing.supplierId) {
        await tx.supplier.update({
          where: { id: existing.supplierId },
          data: {
            outstanding: { increment: existing.amount },
          },
        });
      }

      const updated = await tx.expense.update({
        where: { id },
        data: {
          date: data.date ? new Date(data.date) : undefined,
          category: data.category,
          vendor: data.vendor,
          supplierId: data.supplierId === undefined ? undefined : data.supplierId,
          amount: data.amount,
          paymentMode: data.paymentMode,
          notes: data.notes,
        },
      });

      const nextSupplierId =
        data.supplierId !== undefined ? data.supplierId : existing.supplierId;
      const nextAmount = data.amount !== undefined ? data.amount : existing.amount;

      if (nextSupplierId) {
        await tx.supplier.update({
          where: { id: nextSupplierId },
          data: {
            outstanding: { decrement: nextAmount },
          },
        });
      }

      return updated;
    });
  }
}
