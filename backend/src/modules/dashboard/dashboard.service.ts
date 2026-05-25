import { prisma } from '../../lib/prisma.js';

export class DashboardService {
  async getMetrics() {
    // 1. Core aggregates
    const [
      orders,
      expenses,
      activeJobsCount,
      lowStockCount,
      topPosters,
      recentOrders,
      pipelineGroups,
      shipmentGroups,
      monthlySnapshots
    ] = await Promise.all([
      // Orders aggregates
      prisma.order.findMany({
        select: {
          total: true,
          paid: true
        }
      }),
      // Expenses aggregates
      prisma.expense.findMany({
        select: {
          amount: true
        }
      }),
      // Active print jobs
      prisma.productionJob.count({
        where: {
          NOT: [
            { stage: 'Delivered' },
            { stage: 'Cancelled' }
          ]
        }
      }),
      // Low stock items — Prisma doesn't support column-to-column comparisons,
      // so we fetch all and filter in JS (table is small)
      prisma.inventoryItem.findMany(),
      // Top posters
      prisma.poster.findMany({
        orderBy: { soldThisMonth: 'desc' },
        take: 4
      }),
      // Recent orders
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      // Production pipeline stages count
      prisma.productionJob.groupBy({
        by: ['stage'],
        _count: {
          _all: true
        }
      }),
      // Shipment tracking status count
      prisma.shipment.groupBy({
        by: ['status'],
        _count: {
          _all: true
        }
      }),
      // Monthly snapshots for charts
      prisma.dashboardSnapshot.findMany({
        orderBy: { createdAt: 'asc' },
        take: 12
      })
    ]);

    // Filter low stock in JS (quantity <= reorderLevel)
    const lowStockItems = lowStockCount.filter(
      (item) => item.quantity <= item.reorderLevel
    );

    // Compute KPIs
    const revenue = orders.reduce((sum, o) => sum + o.total, 0);
    const collected = orders.reduce((sum, o) => sum + o.paid, 0);
    const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
    const profit = revenue - expenseTotal;

    // Format pipeline
    const pipeline: Record<string, number> = {};
    pipelineGroups.forEach(g => {
      pipeline[g.stage] = g._count._all;
    });

    // Format shipments
    const shipments: Record<string, number> = {};
    shipmentGroups.forEach(g => {
      shipments[g.status] = g._count._all;
    });

    // Format monthly trends
    // Fallback in case snapshots are empty (fresh start)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyMetrics = monthlySnapshots.length > 0 
      ? monthlySnapshots.map((s, index) => ({
          month: months[index % 12],
          revenue: s.revenue,
          expenses: s.expenses,
          orders: s.orders
        }))
      : [
          { month: 'Current', revenue, expenses: expenseTotal, orders: orders.length }
        ];

    return {
      kpis: {
        revenue,
        collected,
        expenses: expenseTotal,
        profit,
        pendingPrintJobs: activeJobsCount,
        inventoryAlerts: lowStockItems.length
      },
      lowStockItems: lowStockItems.map(item => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        reorderLevel: item.reorderLevel,
        unit: item.unit
      })),
      topPosters,
      recentOrders,
      productionPipeline: pipeline,
      shipmentStats: shipments,
      monthlyMetrics
    };
  }
}
