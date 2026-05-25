import { prisma } from '../../lib/prisma.js';

export class ShipmentsService {
  async list(options: { search?: string; status?: string; skip?: number; take?: number }) {
    const { search, status, skip, take } = options;
    const where: any = {};

    if (search) {
      where.OR = [
        { orderNo: { contains: search, mode: 'insensitive' } },
        { trackingNo: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      prisma.shipment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.shipment.count({ where })
    ]);

    return { items, total };
  }

  async updateStatus(id: string, status: string) {
    return prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.findUnique({ where: { id } });
      if (!shipment) {
        throw new Error('Shipment not found');
      }

      const updated = await tx.shipment.update({
        where: { id },
        data: { status }
      });

      if (status === 'Delivered') {
        // Sync Order status
        await tx.order.update({
          where: { id: shipment.orderId },
          data: { status: 'Delivered' }
        });
      }

      return updated;
    });
  }
}
