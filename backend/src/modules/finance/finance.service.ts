import { prisma } from '../../lib/prisma.js';
import {
  buildMonthKeys,
  createdAtInPeriod,
  expenseDateInPeriod,
  monthKey,
  monthLabelFromKey,
  ResolvedPeriod,
  serializePeriod,
} from '../../utils/period.js';

export interface FinanceSummary {
  revenue: number;
  collected: number;
  expenses: number;
  profit: number;
  orderCount: number;
  period: ReturnType<typeof serializePeriod>;
}

export interface MonthlyMetricRow {
  month: string;
  revenue: number;
  expenses: number;
  orders: number;
}

export interface MonthlyMetricsResult {
  metrics: MonthlyMetricRow[];
  period: ReturnType<typeof serializePeriod>;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function emptyBuckets(keys: string[]): Map<string, MonthlyMetricRow> {
  const buckets = new Map<string, MonthlyMetricRow>();
  for (const key of keys) {
    buckets.set(key, { month: monthLabelFromKey(key), revenue: 0, expenses: 0, orders: 0 });
  }
  return buckets;
}

export class FinanceService {
  async getSummary(period: ResolvedPeriod): Promise<FinanceSummary> {
    const orderWhere = createdAtInPeriod(period);
    const expenseWhere = expenseDateInPeriod(period);

    const [orders, expenses] = await Promise.all([
      prisma.order.findMany({
        where: orderWhere,
        select: { total: true, paid: true },
      }),
      prisma.expense.findMany({
        where: expenseWhere,
        select: { amount: true },
      }),
    ]);

    const revenue = orders.reduce((sum, order) => sum + order.total, 0);
    const collected = orders.reduce((sum, order) => sum + order.paid, 0);
    const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    return {
      revenue,
      collected,
      expenses: expenseTotal,
      profit: revenue - expenseTotal,
      orderCount: orders.length,
      period: serializePeriod(period),
    };
  }

  async getMonthlyMetrics(period: ResolvedPeriod): Promise<MonthlyMetricsResult> {
    const monthKeys = buildMonthKeys(period.monthSpan, period.to);
    const buckets = emptyBuckets(monthKeys);
    const orderWhere = createdAtInPeriod(period);
    const expenseWhere = expenseDateInPeriod(period);

    const [orders, expenses, snapshots] = await Promise.all([
      prisma.order.findMany({
        where: orderWhere,
        select: { total: true, createdAt: true },
      }),
      prisma.expense.findMany({
        where: expenseWhere,
        select: { amount: true, date: true },
      }),
      prisma.dashboardSnapshot.findMany({ orderBy: { createdAt: 'asc' }, take: 12 }),
    ]);

    for (const order of orders) {
      const key = monthKey(order.createdAt);
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.revenue += order.total;
        bucket.orders += 1;
      }
    }

    for (const expense of expenses) {
      const key = monthKey(expense.date);
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.expenses += expense.amount;
      }
    }

    const series = monthKeys.map((key) => buckets.get(key)!);
    const hasLiveData = series.some(
      (row) => row.revenue > 0 || row.expenses > 0 || row.orders > 0
    );

    if (hasLiveData) {
      return { metrics: series, period: serializePeriod(period) };
    }

    if (snapshots.length > 0) {
      const snapshotMetrics = snapshots.slice(-period.monthSpan).map((snapshot, index) => ({
        month: MONTH_LABELS[index % 12],
        revenue: snapshot.revenue,
        expenses: snapshot.expenses,
        orders: snapshot.orders,
      }));
      return { metrics: snapshotMetrics, period: serializePeriod(period) };
    }

    const summary = await this.getSummary(period);
    return {
      metrics: [
        {
          month: monthLabelFromKey(monthKeys[monthKeys.length - 1]),
          revenue: summary.revenue,
          expenses: summary.expenses,
          orders: summary.orderCount,
        },
      ],
      period: serializePeriod(period),
    };
  }
}
