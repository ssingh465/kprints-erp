import { prisma } from '../../lib/prisma.js';
import { createdAtInPeriod, expenseDateInPeriod, ResolvedPeriod, serializePeriod } from '../../utils/period.js';
import { buildAnnualBuckets, yearEndFromDate, yearKeyFromEndDate } from '../../utils/fiscal-buckets.js';
import type { FinancialStatementRow } from './quarterly-results.service.js';

export interface CashFlowStatement {
  statement: 'cash_flow';
  source: 'computed';
  unit: 'INR';
  subtitle: string;
  periods: string[];
  rows: FinancialStatementRow[];
  period: ReturnType<typeof serializePeriod>;
  notes: string[];
}

interface BucketAgg {
  collected: number;
  expenses: number;
  sales: number;
  purchaseOutflow: number;
  financing: number;
}

function safePercent(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
  return (numerator / denominator) * 100;
}

function bucketKeyFromDate(date: Date): string {
  return yearKeyFromEndDate(yearEndFromDate(date));
}

export class CashFlowService {
  async getStatement(period: ResolvedPeriod): Promise<CashFlowStatement> {
    const buckets = buildAnnualBuckets(8, period.to);
    const bucketByKey = new Map<string, BucketAgg>(
      buckets.map((b) => [
        b.key,
        { collected: 0, expenses: 0, sales: 0, purchaseOutflow: 0, financing: 0 },
      ]),
    );

    const notes: string[] = [
      'Operating cash flow uses order paid amounts and expense dates; payment timing beyond paid is not tracked.',
      'Expenses are treated as cash-paid when recorded.',
      'Investing outflows use inventory Purchase movements valued at current item unit cost.',
    ];

    const [orders, expenses, movements, investments] = await Promise.all([
      prisma.order.findMany({
        where: createdAtInPeriod(period),
        select: { total: true, paid: true, createdAt: true },
      }),
      prisma.expense.findMany({
        where: expenseDateInPeriod(period),
        select: { amount: true, date: true },
      }),
      prisma.inventoryMovement.findMany({
        where: {
          type: 'Purchase',
          ...createdAtInPeriod(period),
        },
        select: {
          quantity: true,
          createdAt: true,
          inventoryItem: { select: { unitCost: true } },
        },
      }),
      prisma.partnerInvestment.findMany({
        where: expenseDateInPeriod(period),
        select: { amount: true, date: true },
      }),
    ]);

    for (const order of orders) {
      const key = bucketKeyFromDate(order.createdAt);
      const bucket = bucketByKey.get(key);
      if (!bucket) continue;
      bucket.collected += order.paid;
      bucket.sales += order.total;
    }

    for (const expense of expenses) {
      const key = bucketKeyFromDate(expense.date);
      const bucket = bucketByKey.get(key);
      if (!bucket) continue;
      bucket.expenses += expense.amount;
    }

    for (const movement of movements) {
      const key = bucketKeyFromDate(movement.createdAt);
      const bucket = bucketByKey.get(key);
      if (!bucket) continue;
      const unitCost = movement.inventoryItem?.unitCost ?? 0;
      bucket.purchaseOutflow += Math.abs(movement.quantity) * unitCost;
    }

    for (const investment of investments) {
      const key = bucketKeyFromDate(investment.date);
      const bucket = bucketByKey.get(key);
      if (!bucket) continue;
      bucket.financing += investment.amount;
    }

    const series = buckets.map((b) => bucketByKey.get(b.key)!);

    const cfo = series.map((b) => b.collected - b.expenses);
    const cfi = series.map((b) => -b.purchaseOutflow);
    const cff = series.map((b) => b.financing);
    const netCashFlow = series.map((b, i) => cfo[i] + cfi[i] + cff[i]);
    const freeCashFlow = series.map((b, i) => cfo[i] + cfi[i]);
    const operatingProfit = series.map((b) => b.sales - b.expenses);
    const cfoOp = series.map((b, i) => safePercent(cfo[i], operatingProfit[i]));

    const rows: FinancialStatementRow[] = [
      {
        key: 'cfo',
        label: 'Cash from Operating Activity',
        format: 'amount',
        values: cfo,
      },
      {
        key: 'cfi',
        label: 'Cash from Investing Activity',
        format: 'amount',
        values: cfi,
      },
      {
        key: 'cff',
        label: 'Cash from Financing Activity',
        format: 'amount',
        values: cff,
      },
      {
        key: 'net_cash_flow',
        label: 'Net Cash Flow',
        format: 'amount',
        values: netCashFlow,
        emphasis: true,
      },
      {
        key: 'free_cash_flow',
        label: 'Free Cash Flow',
        format: 'amount',
        values: freeCashFlow,
      },
      {
        key: 'cfo_op',
        label: 'CFO/OP',
        format: 'percent',
        values: cfoOp,
      },
    ];

    return {
      statement: 'cash_flow',
      source: 'computed',
      unit: 'INR',
      subtitle: 'Management cash proxies from ERP transactions (INR)',
      periods: buckets.map((b) => b.label),
      rows,
      period: serializePeriod(period),
      notes,
    };
  }
}
