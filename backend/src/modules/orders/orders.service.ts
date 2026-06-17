import { PRODUCTION_JOB_CREATE_STAGES, PRODUCTION_JOB_STAGES } from '../../constants/stages.js';
import { ArtworksService } from '../artworks/artworks.service.js';
import { prisma } from '../../lib/prisma.js';
import { createdAtInPeriod, ResolvedPeriod } from '../../utils/period.js';
import {
  applyStockConsumption,
  consumesStock,
  restoreStockConsumption,
  syncCustomerStats,
} from '../../utils/order-inventory.js';
import { nextSerialNumber } from '../../utils/serial-numbers.js';
import { getShipmentDefaults } from '../../utils/shipment-defaults.js';

const artworksService = new ArtworksService();

export class OrdersService {
  async list(options: {
    search?: string;
    status?: string;
    priority?: string;
    skip?: number;
    take?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    period?: ResolvedPeriod;
  }) {
    const { search, status, priority, skip, take, sortBy, sortOrder, period } = options;

    const where: Record<string, unknown> = {};

    if (period) {
      Object.assign(where, createdAtInPeriod(period));
    }

    if (search) {
      where.OR = [
        { orderNo: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } },
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
        include: { lines: true },
      }),
      prisma.order.count({ where }),
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
        invoices: true,
        coupon: true,
        payments: true,
      },
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
    couponCode?: string;
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
      const customer = await tx.customer.findUnique({ where: { id: data.customerId } });
      if (!customer) {
        throw new Error('Customer not found');
      }

      let discount = 0;
      let couponId: string | null = null;
      if (data.couponCode) {
        const coupon = await tx.coupon.findUnique({
          where: { code: data.couponCode.toUpperCase() },
        });
        if (!coupon?.active) {
          throw new Error('Invalid or inactive coupon code');
        }
        if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) {
          throw new Error('Coupon usage limit reached');
        }
        discount = Math.min(data.total, coupon.discount);
        couponId = coupon.id;
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usageCount: { increment: 1 } },
        });
      }

      const orderNo = await nextSerialNumber(tx, 'ORD');
      const orderTotal = Math.max(0, data.total - discount);
      const status = data.status || 'Draft';
      const priority = data.priority || 'Normal';
      const lineInputs = data.lines.map((line) => ({
        posterId: line.posterId || null,
        quantity: line.quantity,
      }));

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
          total: orderTotal,
          paid: data.paid ?? 0,
          discount,
          couponId,
          lines: {
            createMany: {
              data: data.lines.map((line) => ({
                posterId: line.posterId || null,
                description: line.description,
                size: line.size,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                framing: line.framing || 'No frame',
              })),
            },
          },
        },
        include: { lines: true },
      });

      await tx.customer.update({
        where: { id: customer.id },
        data: {
          orderCount: { increment: 1 },
          lifetimeValue: { increment: orderTotal },
        },
      });

      if ((PRODUCTION_JOB_CREATE_STAGES as readonly string[]).includes(status)) {
        const jobNo = await nextSerialNumber(tx, 'JOB');
        await tx.productionJob.create({
          data: {
            jobNo,
            orderId: order.id,
            orderNo: order.orderNo,
            customerName: order.customerName,
            stage: status,
            priority: order.priority,
            size: data.lines[0]?.size || 'A3',
            material: data.lines[0]?.framing || 'Matte paper',
            operator: null,
          },
        });
      }

      if (consumesStock(status)) {
        await applyStockConsumption(tx, lineInputs, order.orderNo);
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
        include: { lines: true, productionJob: true, shipment: true },
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
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        },
        include: { lines: true },
      });

      const nextStatus = data.status || current.status;
      const prevConsumesStock = consumesStock(current.status);
      const nextConsumesStock = consumesStock(nextStatus);
      const lineInputs = current.lines.map((line) => ({
        posterId: line.posterId,
        quantity: line.quantity,
      }));

      if (!prevConsumesStock && nextConsumesStock) {
        await applyStockConsumption(tx, lineInputs, current.orderNo);
      } else if (prevConsumesStock && nextStatus === 'Cancelled') {
        await restoreStockConsumption(tx, lineInputs, current.orderNo);
      }

      if (data.total !== undefined && data.total !== current.total) {
        await syncCustomerStats(tx, current.customerId);
      }

      const productionStages = PRODUCTION_JOB_CREATE_STAGES as readonly string[];
      const syncStages = PRODUCTION_JOB_STAGES as readonly string[];

      if (productionStages.includes(nextStatus)) {
        if (!current.productionJob) {
          const jobNo = await nextSerialNumber(tx, 'JOB');
          await tx.productionJob.create({
            data: {
              jobNo,
              orderId: updated.id,
              orderNo: updated.orderNo,
              customerName: updated.customerName,
              stage: nextStatus,
              priority: updated.priority,
              size: updated.lines[0]?.size || 'A3',
              material: updated.lines[0]?.framing || 'Matte paper',
              operator: null,
            },
          });
        } else {
          await tx.productionJob.update({
            where: { id: current.productionJob.id },
            data: { stage: nextStatus, priority: updated.priority },
          });
        }
      } else if (current.productionJob && syncStages.includes(nextStatus)) {
        await tx.productionJob.update({
          where: { id: current.productionJob.id },
          data: { stage: nextStatus, priority: updated.priority },
        });
      }

      if (['Ready for Shipping', 'Delivered'].includes(nextStatus)) {
        if (!current.shipment) {
          const defaults = await getShipmentDefaults(tx);
          const trackNo = `TRK${Math.floor(1000000 + Math.random() * 9000000)}`;
          await tx.shipment.create({
            data: {
              orderId: updated.id,
              orderNo: updated.orderNo,
              customerName: updated.customerName,
              carrier: defaults.carrier,
              trackingNo: trackNo,
              status: nextStatus === 'Delivered' ? 'Delivered' : 'Packed',
              city: defaults.city,
              eta: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            },
          });
        } else if (nextStatus === 'Delivered') {
          await tx.shipment.update({
            where: { id: current.shipment.id },
            data: { status: 'Delivered' },
          });
        }
      }

      return updated;
    });
  }

  async delete(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    await artworksService.deleteByOrderId(id);

    await prisma.$transaction(async (tx) => {
      if (consumesStock(order.status)) {
        await restoreStockConsumption(
          tx,
          order.lines.map((line) => ({ posterId: line.posterId, quantity: line.quantity })),
          order.orderNo
        );
      }

      await tx.order.delete({ where: { id } });
      await syncCustomerStats(tx, order.customerId);
    });
  }
}
