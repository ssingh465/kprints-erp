import { prisma } from '../../lib/prisma.js';
import { createdAtInPeriod, ResolvedPeriod } from '../../utils/period.js';
import { FinanceService } from '../finance/finance.service.js';
import { PostersService } from '../posters/posters.service.js';

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
    };
  }
}
