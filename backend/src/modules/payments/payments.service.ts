import { prisma } from '../../lib/prisma.js';

export class PaymentsService {
  async listOrderPayments(orderId: string) {
    return prisma.orderPayment.findMany({
      where: { orderId },
      orderBy: { receivedAt: 'desc' },
    });
  }

  async recordOrderPayment(data: {
    orderId: string;
    amount: number;
    receivedAt: string | Date;
    method: string;
    notes?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: data.orderId } });
      if (!order) {
        throw new Error('Order not found');
      }

      const payment = await tx.orderPayment.create({
        data: {
          orderId: data.orderId,
          amount: data.amount,
          receivedAt: new Date(data.receivedAt),
          method: data.method,
          notes: data.notes,
        },
      });

      const newPaid = Math.min(order.total, order.paid + data.amount);
      await tx.order.update({
        where: { id: order.id },
        data: { paid: newPaid },
      });

      return payment;
    });
  }

  async listSupplierPayments(supplierId: string) {
    return prisma.supplierPayment.findMany({
      where: { supplierId },
      orderBy: { paidAt: 'desc' },
    });
  }

  async recordSupplierPayment(data: {
    supplierId: string;
    amount: number;
    paidAt: string | Date;
    method: string;
    notes?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findUnique({ where: { id: data.supplierId } });
      if (!supplier) {
        throw new Error('Supplier not found');
      }

      const payment = await tx.supplierPayment.create({
        data: {
          supplierId: data.supplierId,
          amount: data.amount,
          paidAt: new Date(data.paidAt),
          method: data.method,
          notes: data.notes,
        },
      });

      await tx.supplier.update({
        where: { id: supplier.id },
        data: { outstanding: { decrement: data.amount } },
      });

      return payment;
    });
  }
}
