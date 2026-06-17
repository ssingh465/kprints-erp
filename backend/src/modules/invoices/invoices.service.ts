import { prisma } from '../../lib/prisma.js';
import { nextSerialNumber } from '../../utils/serial-numbers.js';
import type { Prisma } from '@prisma/client';

export class InvoicesService {
  async list(options: { search?: string; skip?: number; take?: number }) {
    const { search, skip, take } = options;
    const where: Prisma.InvoiceWhereInput = {};

    if (search) {
      where.OR = [
        { invoiceNo: { contains: search, mode: 'insensitive' } },
        { order: { orderNo: { contains: search, mode: 'insensitive' } } },
        { order: { customerName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          order: { select: { orderNo: true, customerName: true, status: true, total: true } },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    return { items, total };
  }

  async getById(id: string) {
    return prisma.invoice.findUnique({
      where: { id },
      include: {
        order: {
          include: { lines: true },
        },
      },
    });
  }

  async createForOrder(orderId: string, amount?: number) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) {
        throw new Error('Order not found');
      }

      const existing = await tx.invoice.findFirst({ where: { orderId } });
      if (existing) {
        throw new Error(`Invoice already exists for order ${order.orderNo}`);
      }

      const invoiceNo = await nextSerialNumber(tx, 'INV');
      const invoiceAmount = amount ?? order.total;

      return tx.invoice.create({
        data: {
          invoiceNo,
          orderId,
          amount: invoiceAmount,
        },
        include: {
          order: { select: { orderNo: true, customerName: true, status: true } },
        },
      });
    });
  }

  async delete(id: string) {
    return prisma.invoice.delete({ where: { id } });
  }
}
