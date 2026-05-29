import { prisma } from '../../lib/prisma.js';

export class ProductionService {
  async list(options: {
    search?: string;
    stage?: string;
    priority?: string;
    skip?: number;
    take?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { search, stage, priority, skip, take, sortBy, sortOrder } = options;

    const where: any = {};

    if (search) {
      where.OR = [
        { jobNo: { contains: search, mode: 'insensitive' } },
        { orderNo: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { operator: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (stage) {
      where.stage = stage;
    }

    if (priority) {
      where.priority = priority;
    }

    const [items, total] = await Promise.all([
      prisma.productionJob.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' }
      }),
      prisma.productionJob.count({ where })
    ]);

    return { items, total };
  }

  async getById(id: string) {
    return prisma.productionJob.findUnique({
      where: { id },
      include: {
        order: true
      }
    });
  }

  async updateStage(id: string, stage: string) {
    return prisma.$transaction(async (tx) => {
      const job = await tx.productionJob.findUnique({ where: { id } });
      if (!job) {
        throw new Error('Production job not found');
      }

      // Update job stage
      const updatedJob = await tx.productionJob.update({
        where: { id },
        data: { stage }
      });

      // Synchronize with the underlying order status!
      await tx.order.update({
        where: { id: job.orderId },
        data: { status: stage }
      });

      // If status is moves into shipping, trigger shipment creation!
      if (['Ready for Shipping', 'Ready for Pickup'].includes(stage)) {
        const currentShipment = await tx.shipment.findUnique({ where: { orderId: job.orderId } });
        if (!currentShipment) {
          const trackNo = `TRK${Math.floor(1000000 + Math.random() * 9000000)}`;
          await tx.shipment.create({
            data: {
              orderId: job.orderId,
              orderNo: job.orderNo,
              customerName: job.customerName,
              carrier: 'Delhivery',
              trackingNo: trackNo,
              status: 'Packed',
              city: 'Delhi',
              eta: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
            }
          });
        }
      }

      return updatedJob;
    });
  }

  async assignOperator(id: string, operator: string, estimatedCompletion?: string | Date) {
    return prisma.productionJob.update({
      where: { id },
      data: {
        operator,
        estimatedCompletion: estimatedCompletion ? new Date(estimatedCompletion) : undefined
      }
    });
  }
}
