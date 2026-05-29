import { prisma } from '../../lib/prisma.js';
import { ResolvedPeriod, serializePeriod } from '../../utils/period.js';
import { buildAnnualBuckets } from '../../utils/fiscal-buckets.js';
import type { FinancialStatementRow } from './quarterly-results.service.js';

export interface BalanceSheetStatement {
  statement: 'balance_sheet';
  source: 'computed';
  unit: 'INR';
  subtitle: string;
  periods: string[];
  rows: FinancialStatementRow[];
  period: ReturnType<typeof serializePeriod>;
  notes: string[];
}

interface SnapshotAgg {
  equityCapital: number;
  reserves: number;
  borrowings: number;
  otherLiabilities: number;
  fixedAssets: number;
  cwip: number;
  investments: number;
  otherAssets: number;
  totalLiabilities: number;
  totalAssets: number;
}

export class BalanceSheetService {
  async getStatement(period: ResolvedPeriod): Promise<BalanceSheetStatement> {
    const buckets = buildAnnualBuckets(8, period.to);

    // v1 limitations: we don't store historical snapshots for supplier outstanding or inventory valuation.
    const notes: string[] = [
      'Borrowings use current supplier outstanding; historical snapshots are not tracked yet.',
      'Inventory valuation uses current stock × unit cost; historical snapshots are not tracked yet.',
      'Fixed assets, CWIP, and Investments are not tracked yet (shown as 0).',
    ];

    // Fetch enough data once, then compute cumulative up to each bucket end.
    const maxEnd = buckets[buckets.length - 1]?.end ?? period.to;

    const [orders, expenses, investments, suppliers, inventory] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { lte: maxEnd } },
        select: { total: true, paid: true, createdAt: true },
      }),
      prisma.expense.findMany({
        where: { date: { lte: maxEnd } },
        select: { amount: true, date: true },
      }),
      prisma.partnerInvestment.findMany({
        where: { date: { lte: maxEnd } },
        select: { amount: true, date: true },
      }),
      prisma.supplier.findMany({
        select: { outstanding: true },
      }),
      prisma.inventoryItem.findMany({
        select: { quantity: true, unitCost: true },
      }),
    ]);

    const currentBorrowings = suppliers.reduce((sum, s) => sum + (s.outstanding ?? 0), 0);
    const currentInventoryValue = inventory.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);

    const snapshots: SnapshotAgg[] = buckets.map((bucket) => {
      const end = bucket.end;

      const salesToDate = orders
        .filter((o) => o.createdAt <= end)
        .reduce((sum, o) => sum + o.total, 0);

      const expensesToDate = expenses
        .filter((e) => e.date <= end)
        .reduce((sum, e) => sum + e.amount, 0);

      const unpaidOrdersToDate = orders
        .filter((o) => o.createdAt <= end)
        .reduce((sum, o) => sum + Math.max(0, o.total - o.paid), 0);

      const investmentsToDate = investments
        .filter((i) => i.date <= end)
        .reduce((sum, i) => sum + i.amount, 0);

      const equityCapital = investmentsToDate;
      const reserves = salesToDate - expensesToDate - investmentsToDate;
      const borrowings = currentBorrowings;
      const otherLiabilities = unpaidOrdersToDate;

      const fixedAssets = 0;
      const cwip = 0;
      const investmentsRow = 0;

      const otherAssets = currentInventoryValue + unpaidOrdersToDate;

      const totalLiabilities = equityCapital + reserves + borrowings + otherLiabilities;
      const totalAssets = fixedAssets + cwip + investmentsRow + otherAssets;

      return {
        equityCapital,
        reserves,
        borrowings,
        otherLiabilities,
        totalLiabilities,
        fixedAssets,
        cwip,
        investments: investmentsRow,
        otherAssets,
        totalAssets,
      };
    });

    const rows: FinancialStatementRow[] = [
      {
        key: 'equity_capital',
        label: 'Equity Capital',
        format: 'amount',
        values: snapshots.map((s) => s.equityCapital),
      },
      {
        key: 'reserves',
        label: 'Reserves',
        format: 'amount',
        values: snapshots.map((s) => s.reserves),
      },
      {
        key: 'borrowings',
        label: 'Borrowings',
        format: 'amount',
        values: snapshots.map((s) => s.borrowings),
      },
      {
        key: 'other_liabilities',
        label: 'Other Liabilities',
        format: 'amount',
        values: snapshots.map((s) => s.otherLiabilities),
      },
      {
        key: 'total_liabilities',
        label: 'Total Liabilities',
        format: 'amount',
        values: snapshots.map((s) => s.totalLiabilities),
        emphasis: true,
      },
      {
        key: 'fixed_assets',
        label: 'Fixed Assets',
        format: 'amount',
        values: snapshots.map((s) => s.fixedAssets),
      },
      {
        key: 'cwip',
        label: 'CWIP',
        format: 'amount',
        values: snapshots.map((s) => s.cwip),
      },
      {
        key: 'investments',
        label: 'Investments',
        format: 'amount',
        values: snapshots.map((s) => s.investments),
      },
      {
        key: 'other_assets',
        label: 'Other Assets',
        format: 'amount',
        values: snapshots.map((s) => s.otherAssets),
      },
      {
        key: 'total_assets',
        label: 'Total Assets',
        format: 'amount',
        values: snapshots.map((s) => s.totalAssets),
        emphasis: true,
      },
    ];

    return {
      statement: 'balance_sheet',
      source: 'computed',
      unit: 'INR',
      subtitle: 'Management estimates from ERP transactions (INR)',
      periods: buckets.map((b) => b.label),
      rows,
      period: serializePeriod(period),
      notes,
    };
  }
}

