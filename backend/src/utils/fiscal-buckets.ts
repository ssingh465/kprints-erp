const QUARTER_END_MONTHS = [2, 5, 8, 11] as const; // Mar, Jun, Sep, Dec (0-indexed)
const QUARTER_END_LABELS = ['Mar', 'Jun', 'Sep', 'Dec'] as const;

export interface FiscalBucket {
  /** Stable key suitable for maps. */
  key: string;
  /** Human label shown in the table header (e.g. "Mar 2026"). */
  label: string;
  /** Inclusive end-of-bucket timestamp (UTC). */
  end: Date;
}

function endOfUtcMonth(year: number, monthIndex: number): Date {
  // Day 0 of next month = last day of current month.
  return new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
}

function quarterIndexFromMonth(monthIndex: number): 0 | 1 | 2 | 3 {
  if (monthIndex <= 2) return 0;
  if (monthIndex <= 5) return 1;
  if (monthIndex <= 8) return 2;
  return 3;
}

export function quarterEndFromDate(date: Date): Date {
  const year = date.getUTCFullYear();
  const quarterIndex = quarterIndexFromMonth(date.getUTCMonth());
  const endMonth = QUARTER_END_MONTHS[quarterIndex];
  return endOfUtcMonth(year, endMonth);
}

export function quarterLabelFromEndDate(quarterEnd: Date): string {
  const year = quarterEnd.getUTCFullYear();
  const month = quarterEnd.getUTCMonth();
  const idx = QUARTER_END_MONTHS.indexOf(month as (typeof QUARTER_END_MONTHS)[number]);
  const labelMonth = QUARTER_END_LABELS[idx >= 0 ? idx : 0];
  return `${labelMonth} ${year}`;
}

export function quarterKeyFromEndDate(quarterEnd: Date): string {
  return `${quarterEnd.getUTCFullYear()}-${String(quarterEnd.getUTCMonth() + 1).padStart(2, '0')}-QEND`;
}

/** Last N fiscal quarters ending at the quarter containing anchor (UTC). */
export function buildQuarterBuckets(count = 8, anchor = new Date()): FiscalBucket[] {
  const size = Math.max(1, count);
  const anchorEnd = quarterEndFromDate(anchor);
  const buckets: FiscalBucket[] = [];

  for (let i = size - 1; i >= 0; i--) {
    // Move back i quarters from anchor quarter end.
    const end = new Date(Date.UTC(anchorEnd.getUTCFullYear(), anchorEnd.getUTCMonth() - i * 3, 1));
    const quarterEnd = quarterEndFromDate(end);
    buckets.push({
      key: quarterKeyFromEndDate(quarterEnd),
      label: quarterLabelFromEndDate(quarterEnd),
      end: quarterEnd,
    });
  }

  return buckets;
}

export function yearEndFromDate(date: Date): Date {
  // Screener annual columns are labeled "Mar YYYY". Use March 31 as year-end.
  const year = date.getUTCFullYear();
  return endOfUtcMonth(year, 2);
}

export function yearLabelFromEndDate(yearEnd: Date): string {
  return `Mar ${yearEnd.getUTCFullYear()}`;
}

export function yearKeyFromEndDate(yearEnd: Date): string {
  return `${yearEnd.getUTCFullYear()}-03-YEND`;
}

/** Last N years ending at the year containing anchor (UTC), using Mar 31 year-end labels. */
export function buildAnnualBuckets(count = 8, anchor = new Date()): FiscalBucket[] {
  const size = Math.max(1, count);
  const anchorEnd = yearEndFromDate(anchor);
  const buckets: FiscalBucket[] = [];

  for (let i = size - 1; i >= 0; i--) {
    const yearEnd = yearEndFromDate(new Date(Date.UTC(anchorEnd.getUTCFullYear() - i, 0, 1)));
    buckets.push({
      key: yearKeyFromEndDate(yearEnd),
      label: yearLabelFromEndDate(yearEnd),
      end: yearEnd,
    });
  }

  return buckets;
}

