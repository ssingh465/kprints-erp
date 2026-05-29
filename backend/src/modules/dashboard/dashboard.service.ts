import { prisma } from '../../lib/prisma.js';
import { createdAtInPeriod, monthKey, monthLabelFromKey, ResolvedPeriod } from '../../utils/period.js';
import { FinanceService } from '../finance/finance.service.js';
import { PostersService } from '../posters/posters.service.js';

export interface ActivityEvent {
  status: string;
  detail: string;
  occurredAt: string;
}

export interface OperationalSignals {
  notifications: string[];
  activityTimeline: ActivityEvent[];
}

const UNASSIGNED_OPERATOR = 'Operator Unassigned';

function isUnassignedOperator(operator: string | null | undefined): boolean {
  const value = operator?.trim();
  return !value || value === UNASSIGNED_OPERATOR;
}

export class DashboardService {
  private readonly finance = new FinanceService();
  private readonly posters = new PostersService();

  async getMetrics(period: ResolvedPeriod) {
    const [
      summary,
      monthlyResult,
      activeJobsCount,
      lowStockCount,
      topPosters,
      recentOrders,
      pipelineGroups,
      shipmentGroups,
    ] = await Promise.all([
      this.finance.getSummary(period),
      this.finance.getMonthlyMetrics(period),
      prisma.productionJob.count({
        where: {
          NOT: [{ stage: 'Delivered' }, { stage: 'Cancelled' }],
        },
      }),
      prisma.inventoryItem.findMany(),
      this.posters.getTopSelling(period, 4),
      prisma.order.findMany({
        where: createdAtInPeriod(period),
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.productionJob.groupBy({
        by: ['stage'],
        _count: { _all: true },
      }),
      prisma.shipment.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    const lowStockItems = lowStockCount.filter(
      (item) => item.quantity <= item.reorderLevel
    );

    const pipeline: Record<string, number> = {};
    pipelineGroups.forEach((g) => {
      pipeline[g.stage] = g._count._all;
    });

    const shipments: Record<string, number> = {};
    shipmentGroups.forEach((g) => {
      shipments[g.status] = g._count._all;
    });

    const signals = await this.getOperationalSignals();

    return {
      kpis: {
        revenue: summary.revenue,
        collected: summary.collected,
        expenses: summary.expenses,
        profit: summary.profit,
        orderCount: summary.orderCount,
        pendingPrintJobs: activeJobsCount,
        inventoryAlerts: lowStockItems.length,
      },
      lowStockItems: lowStockItems.map((item) => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        reorderLevel: item.reorderLevel,
        unit: item.unit,
      })),
      topPosters,
      recentOrders,
      productionPipeline: pipeline,
      shipmentStats: shipments,
      monthlyMetrics: monthlyResult.metrics,
      period: summary.period,
      notifications: signals.notifications,
      activityTimeline: signals.activityTimeline,
    };
  }

  async getOperationalSignals(): Promise<OperationalSignals> {
    const [
      activeJobs,
      inventoryItems,
      packedShipments,
      recentOrders,
      recentDeliveries,
      ordersForMargin,
      expensesForMargin,
    ] = await Promise.all([
      prisma.productionJob.findMany({
        where: { NOT: [{ stage: 'Delivered' }, { stage: 'Cancelled' }] },
        orderBy: { updatedAt: 'desc' },
        take: 8,
      }),
      prisma.inventoryItem.findMany(),
      prisma.shipment.findMany({
        where: { status: 'Packed' },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
      prisma.order.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
      prisma.shipment.findMany({
        where: { status: 'Delivered' },
        orderBy: { updatedAt: 'desc' },
        take: 3,
      }),
      prisma.order.findMany({
        select: { total: true, createdAt: true },
      }),
      prisma.expense.findMany({
        select: { amount: true, date: true },
      }),
    ]);

    const lowStockItems = inventoryItems.filter((item) => item.quantity <= item.reorderLevel);
    const unassignedCount = activeJobs.filter((job) => isUnassignedOperator(job.operator)).length;

    const notifications: string[] = [];
    if (unassignedCount > 0) {
      notifications.push(
        `${unassignedCount} print job${unassignedCount === 1 ? '' : 's'} require operator assignment`
      );
    }
    for (const item of lowStockItems.slice(0, 5)) {
      notifications.push(`${item.name} is below reorder level`);
    }
    for (const shipment of packedShipments) {
      notifications.push(`${shipment.orderNo} is packed and ready for carrier pickup`);
    }

    const marginNotice = this.buildProfitMarginNotice(ordersForMargin, expensesForMargin);
    if (marginNotice) {
      notifications.push(marginNotice);
    }

    const activityTimeline: ActivityEvent[] = [];

    for (const job of activeJobs.slice(0, 4)) {
      activityTimeline.push({
        status: job.stage,
        detail: `${job.orderNo} · ${job.customerName}`,
        occurredAt: job.updatedAt.toISOString(),
      });
    }
    for (const order of recentOrders.slice(0, 3)) {
      activityTimeline.push({
        status: order.status,
        detail: `${order.orderNo} · ${order.customerName}`,
        occurredAt: order.updatedAt.toISOString(),
      });
    }
    for (const item of lowStockItems.slice(0, 2)) {
      activityTimeline.push({
        status: 'Low Stock',
        detail: `${item.name} needs purchase approval`,
        occurredAt: item.updatedAt.toISOString(),
      });
    }
    for (const shipment of recentDeliveries) {
      activityTimeline.push({
        status: 'Delivered',
        detail: `${shipment.orderNo} delivered in ${shipment.city}`,
        occurredAt: shipment.updatedAt.toISOString(),
      });
    }

    activityTimeline.sort(
      (left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()
    );

    return {
      notifications,
      activityTimeline: activityTimeline.slice(0, 8).map(({ status, detail, occurredAt }) => ({
        status,
        detail,
        occurredAt,
      })),
    };
  }

  private buildProfitMarginNotice(
    orders: Array<{ total: number; createdAt: Date }>,
    expenses: Array<{ amount: number; date: Date }>
  ): string | null {
    const now = new Date();
    const currentKey = monthKey(now);
    const previousDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousKey = monthKey(previousDate);

    const totals = new Map<string, { revenue: number; expenses: number }>();
    for (const key of [currentKey, previousKey]) {
      totals.set(key, { revenue: 0, expenses: 0 });
    }

    for (const order of orders) {
      const bucket = totals.get(monthKey(order.createdAt));
      if (bucket) bucket.revenue += order.total;
    }
    for (const expense of expenses) {
      const bucket = totals.get(monthKey(expense.date));
      if (bucket) bucket.expenses += expense.amount;
    }

    const current = totals.get(currentKey);
    const previous = totals.get(previousKey);
    if (!current || !previous || current.revenue <= 0 || previous.revenue <= 0) {
      return null;
    }

    const currentMargin = ((current.revenue - current.expenses) / current.revenue) * 100;
    const previousMargin = ((previous.revenue - previous.expenses) / previous.revenue) * 100;
    const diff = currentMargin - previousMargin;
    if (Math.abs(diff) < 0.1) {
      return null;
    }

    const currentLabel = monthLabelFromKey(currentKey);
    const previousLabel = monthLabelFromKey(previousKey);
    return `${currentLabel} profit margin is tracking ${Math.abs(diff).toFixed(1)}% ${
      diff > 0 ? 'above' : 'below'
    } ${previousLabel}`;
  }
}
