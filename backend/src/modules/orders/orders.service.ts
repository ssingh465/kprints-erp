import { prisma } from '../../lib/prisma.js';

export class OrdersService {
  async list(options: {
    search?: string;
    status?: string;
    priority?: string;
    skip?: number;
    take?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { search, status, priority, skip, take, sortBy, sortOrder } = options;

    const where: any = {};

    if (search) {
      where.OR = [
        { orderNo: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status && status !== 'All') {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
        include: {
          lines: true
        }
      }),
      prisma.order.count({ where })
    ]);

    return { items, total };
  }

  async getById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: {
        lines: true,
        productionJob: true,
        shipment: true,
        artworks: true,
        invoices: true
      }
    });
  }

  async create(data: {
    customerId: string;
    type: string;
    channel: string;
    status?: string;
    priority?: string;
    dueDate: string | Date;
    total: number;
    paid?: number;
    lines: Array<{
      posterId?: string | null;
      description: string;
      size: string;
      quantity: number;
      unitPrice: number;
      framing?: string | null;
    }>;
  }) {
    return prisma.$transaction(async (tx) => {
      // 1. Resolve Customer
      const customer = await tx.customer.findUnique({
        where: { id: data.customerId }
      });
      if (!customer) {
        throw new Error('Customer not found');
      }

      // 2. Generate Serial Order No (e.g. ORD-1052)
      const count = await tx.order.count();
      const orderNo = `ORD-${1048 + count + 1}`;

      const status = data.status || 'Draft';
      const priority = data.priority || 'Normal';

      // 3. Create Order & nested items
      const order = await tx.order.create({
        data: {
          orderNo,
          customerId: data.customerId,
          customerName: customer.name,
          type: data.type,
          channel: data.channel,
          status,
          priority,
          dueDate: new Date(data.dueDate),
          total: data.total,
          paid: data.paid ?? 0,
          lines: {
            createMany: {
              data: data.lines.map(line => ({
                posterId: line.posterId || null,
                description: line.description,
                size: line.size,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                framing: line.framing || 'No frame'
              }))
            }
          }
        },
        include: {
          lines: true
        }
      });

      // 4. Update Customer Stats
      await tx.customer.update({
        where: { id: customer.id },
        data: {
          orderCount: { increment: 1 },
          lifetimeValue: { increment: data.total }
        }
      });

      // 5. Handle initial production job creation
      if (['Design Approved', 'Printing Queued', 'Printing In Progress', 'Lamination', 'Framing', 'Packaging'].includes(status)) {
        await tx.productionJob.create({
          data: {
            jobNo: `JOB-${500 + count + 1}`,
            orderId: order.id,
            orderNo: order.orderNo,
            customerName: order.customerName,
            stage: status,
            priority: order.priority,
            size: data.lines[0]?.size || 'A3',
            material: data.lines[0]?.framing || 'Matte paper',
            operator: 'Operator Unassigned'
          }
        });
      }

      return order;
    });
  }

  async update(
    id: string,
    data: Partial<{
      status: string;
      priority: string;
      paid: number;
      total: number;
      dueDate: string | Date;
    }>
  ) {
    return prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({
        where: { id },
        include: { lines: true, productionJob: true, shipment: true }
      });

      if (!current) {
        throw new Error('Order not found');
      }

      const updated = await tx.order.update({
        where: { id },
        data: {
          status: data.status,
          priority: data.priority,
          paid: data.paid,
          total: data.total,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined
        },
        include: {
          lines: true
        }
      });

      const nextStatus = data.status || current.status;

      // 1. Sync Production Job if status moves into print queue stages
      const productionStages = ['Design Approved', 'Printing Queued', 'Printing In Progress', 'Lamination', 'Framing', 'Packaging'];
      if (productionStages.includes(nextStatus)) {
        if (!current.productionJob) {
          const count = await tx.productionJob.count();
          await tx.productionJob.create({
            data: {
              jobNo: `JOB-${500 + count + 1}`,
              orderId: updated.id,
              orderNo: updated.orderNo,
              customerName: updated.customerName,
              stage: nextStatus,
              priority: updated.priority,
              size: updated.lines[0]?.size || 'A3',
              material: updated.lines[0]?.framing || 'Matte paper',
              operator: 'Operator Unassigned'
            }
          });
        } else {
          await tx.productionJob.update({
            where: { id: current.productionJob.id },
            data: {
              stage: nextStatus,
              priority: updated.priority
            }
          });
        }
      } else if (current.productionJob && ['Delivered', 'Cancelled'].includes(nextStatus)) {
        // Update production job if completed or cancelled
        await tx.productionJob.update({
          where: { id: current.productionJob.id },
          data: {
            stage: nextStatus
          }
        });
      }

      // 2. Sync Shipment if status moves into shipping stages
      if (['Ready for Shipping', 'Delivered'].includes(nextStatus)) {
        if (!current.shipment) {
          const trackNo = `TRK${Math.floor(1000000 + Math.random() * 9000000)}`;
          await tx.shipment.create({
            data: {
              orderId: updated.id,
              orderNo: updated.orderNo,
              customerName: updated.customerName,
              carrier: 'Delhivery',
              trackingNo: trackNo,
              status: nextStatus === 'Delivered' ? 'Delivered' : 'Packed',
              city: 'Delhi',
              eta: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // Today + 2 days
            }
          });
        } else if (nextStatus === 'Delivered') {
          await tx.shipment.update({
            where: { id: current.shipment.id },
            data: {
              status: 'Delivered'
            }
          });
        }
      }

      return updated;
    });
  }

  async delete(id: string) {
    return prisma.order.delete({
      where: { id }
    });
  }
}
