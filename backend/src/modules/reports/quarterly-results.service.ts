import { prisma } from '../../lib/prisma.js';
import { createdAtInPeriod, dateInPeriod, ResolvedPeriod, serializePeriod } from '../../utils/period.js';
import { buildQuarterBuckets, quarterEndFromDate, quarterKeyFromEndDate } from '../../utils/fiscal-buckets.js';

export type FinancialRowFormat = 'amount' | 'percent';

export interface FinancialStatementRow {
  key: string;
  label: string;
  format: FinancialRowFormat;
  values: (number | null)[];
  emphasis?: boolean;
}

export interface QuarterlyResultsStatement {
  statement: 'quarterly';
  source: 'computed';
  unit: 'INR';
  subtitle: string;
  periods: string[];
  rows: FinancialStatementRow[];
  period: ReturnType<typeof serializePeriod>;
}

interface BucketAgg {
  sales: number;
  expenses: number;
  interest: number;
  depreciation: number;
  taxExpense: number;
}

function safePercent(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
  return (numerator / denominator) * 100;
}

export class QuarterlyResultsService {
  async getStatement(period: ResolvedPeriod): Promise<QuarterlyResultsStatement> {
    const buckets = buildQuarterBuckets(8, period.to);
    const bucketByKey = new Map<string, BucketAgg>(
      buckets.map((b) => [
        b.key,
        { sales: 0, expenses: 0, interest: 0, depreciation: 0, taxExpense: 0 },
      ]),
    );

    const [orders, expenses] = await Promise.all([
      prisma.order.findMany({
        where: createdAtInPeriod(period),
        select: { total: true, createdAt: true },
      }),
      prisma.expense.findMany({
        where: dateInPeriod(period),
        select: { amount: true, category: true, date: true },
      }),
    ]);

    for (const order of orders) {
      const quarterEnd = quarterEndFromDate(order.createdAt);
      const key = quarterKeyFromEndDate(quarterEnd);
      const bucket = bucketByKey.get(key);
      if (!bucket) continue;
      bucket.sales += order.total;
    }

    for (const expense of expenses) {
      const quarterEnd = quarterEndFromDate(expense.date);
      const key = quarterKeyFromEndDate(quarterEnd);
      const bucket = bucketByKey.get(key);
      if (!bucket) continue;

      bucket.expenses += expense.amount;

      const category = expense.category ?? '';
      if (/interest/i.test(category)) {
        bucket.interest += expense.amount;
      }
      if (/depreciation/i.test(category)) {
        bucket.depreciation += expense.amount;
      }
      if (/tax/i.test(category)) {
        bucket.taxExpense += expense.amount;
      }
    }

    const series = buckets.map((b) => bucketByKey.get(b.key)!);

    const sales = series.map((b) => b.sales);
    const expensesTotal = series.map((b) => b.expenses);
    const operatingProfit = series.map((b, i) => sales[i] - expensesTotal[i]);
    const opmPct = series.map((b, i) => safePercent(operatingProfit[i], sales[i]));
    const otherIncome = series.map(() => 0);
    const interest = series.map((b) => b.interest);
    const depreciation = series.map((b) => b.depreciation);
    const pbt = series.map((b, i) => operatingProfit[i] + otherIncome[i] - interest[i] - depreciation[i]);
    const taxPct = series.map((b, i) => safePercent(b.taxExpense, pbt[i]));
    const netProfit = series.map((b, i) => pbt[i] - b.taxExpense);

    const rows: FinancialStatementRow[] = [
      { key: 'sales', label: 'Sales', format: 'amount', values: sales },
      { key: 'expenses', label: 'Expenses', format: 'amount', values: expensesTotal },
      { key: 'operating_profit', label: 'Operating Profit', format: 'amount', values: operatingProfit, emphasis: true },
      { key: 'opm_pct', label: 'OPM %', format: 'percent', values: opmPct },
      { key: 'other_income', label: 'Other Income', format: 'amount', values: otherIncome },
      { key: 'interest', label: 'Interest', format: 'amount', values: interest },
      { key: 'depreciation', label: 'Depreciation', format: 'amount', values: depreciation },
      { key: 'profit_before_tax', label: 'Profit before tax', format: 'amount', values: pbt },
      { key: 'tax_pct', label: 'Tax %', format: 'percent', values: taxPct },
      { key: 'net_profit', label: 'Net Profit', format: 'amount', values: netProfit, emphasis: true },
    ];

    return {
      statement: 'quarterly',
      source: 'computed',
      unit: 'INR',
      subtitle: 'Management accounts from ERP transactions (INR)',
      periods: buckets.map((b) => b.label),
      rows,
      period: serializePeriod(period),
    };
  }
}

