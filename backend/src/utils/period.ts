export const PERIOD_PRESETS = ['this_month', 'last3m', 'last6m', 'last12m', 'all', 'custom'] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

export interface PeriodMeta {
  preset: PeriodPreset;
  from: string | null;
  to: string;
  label: string;
}

export interface ResolvedPeriod {
  preset: PeriodPreset;
  from: Date | null;
  to: Date;
  label: string;
  /** Calendar months to include in chart buckets (min 1). */
  monthSpan: number;
}

const PRESET_LABELS: Record<PeriodPreset, string> = {
  this_month: 'This month',
  last3m: 'Last 3 months',
  last6m: 'Last 6 months',
  last12m: 'Last 12 months',
  all: 'All time',
  custom: 'Custom range',
};

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function endOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function isPeriodPreset(value: string): value is PeriodPreset {
  return (PERIOD_PRESETS as readonly string[]).includes(value);
}

/**
 * Parse a YYYY-MM-DD style string into a UTC Date.
 * Accepts full ISO strings too. Returns null when the input is missing or invalid.
 */
function parseInputDate(raw: string | undefined | null): Date | null {
  if (!raw) {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  // Treat plain YYYY-MM-DD strings as UTC midnight to avoid timezone drift.
  const shortMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (shortMatch) {
    const [, y, m, d] = shortMatch;
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatCustomLabel(from: Date, to: Date): string {
  const fromYear = from.getUTCFullYear();
  const toYear = to.getUTCFullYear();
  const fromMonth = MONTH_LABELS[from.getUTCMonth()] ?? '';
  const toMonth = MONTH_LABELS[to.getUTCMonth()] ?? '';
  const fromDay = from.getUTCDate();
  const toDay = to.getUTCDate();

  if (fromYear === toYear) {
    return `${fromDay} ${fromMonth} – ${toDay} ${toMonth} ${toYear}`;
  }
  return `${fromDay} ${fromMonth} ${fromYear} – ${toDay} ${toMonth} ${toYear}`;
}

function calculateMonthSpan(from: Date, to: Date): number {
  const months =
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
    (to.getUTCMonth() - from.getUTCMonth()) +
    1;
  return Math.max(1, months);
}

export function parsePeriodFromQuery(
  query: Record<string, string | undefined>,
  defaultPreset: PeriodPreset = 'last12m'
): ResolvedPeriod {
  const raw = query.period?.trim() || defaultPreset;
  const preset = isPeriodPreset(raw) ? raw : defaultPreset;
  const anchor = new Date();
  const to = endOfUtcDay(anchor);

  switch (preset) {
    case 'this_month':
      return {
        preset,
        from: startOfUtcMonth(anchor),
        to,
        label: PRESET_LABELS[preset],
        monthSpan: 1,
      };
    case 'last3m':
      return {
        preset,
        from: startOfUtcMonth(new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - 2, 1))),
        to,
        label: PRESET_LABELS[preset],
        monthSpan: 3,
      };
    case 'last6m':
      return {
        preset,
        from: startOfUtcMonth(new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - 5, 1))),
        to,
        label: PRESET_LABELS[preset],
        monthSpan: 6,
      };
    case 'last12m':
      return {
        preset,
        from: startOfUtcMonth(new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - 11, 1))),
        to,
        label: PRESET_LABELS[preset],
        monthSpan: 12,
      };
    case 'custom': {
      const fromInput = parseInputDate(query.from);
      const toInput = parseInputDate(query.to);
      if (fromInput && toInput && fromInput.getTime() <= toInput.getTime()) {
        const fromDay = startOfUtcDay(fromInput);
        const toDay = endOfUtcDay(toInput);
        return {
          preset,
          from: fromDay,
          to: toDay,
          label: formatCustomLabel(fromDay, toDay),
          monthSpan: calculateMonthSpan(fromDay, toDay),
        };
      }
      // Fall through to default when custom range is missing/invalid.
      return parsePeriodFromQuery({ period: defaultPreset }, defaultPreset);
    }
    case 'all':
    default:
      return {
        preset: 'all',
        from: null,
        to,
        label: PRESET_LABELS.all,
        monthSpan: 12,
      };
  }
}

export function serializePeriod(period: ResolvedPeriod): PeriodMeta {
  return {
    preset: period.preset,
    from: period.from?.toISOString() ?? null,
    to: period.to.toISOString(),
    label: period.label,
  };
}

export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function monthLabelFromKey(key: string): string {
  const [, monthPart] = key.split('-');
  const index = parseInt(monthPart, 10) - 1;
  const year = key.split('-')[0];
  const short = MONTH_LABELS[index] ?? key;
  return `${short} ${year}`;
}

/** Last N calendar months ending in the anchor month (UTC), inclusive. */
export function buildMonthKeys(monthSpan: number, anchor = new Date()): string[] {
  const count = Math.max(1, monthSpan);
  const cursor = new Date(anchor);
  cursor.setUTCDate(1);
  const keys: string[] = [];

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() - i, 1));
    keys.push(monthKey(d));
  }

  return keys;
}

export function createdAtInPeriod(period: ResolvedPeriod): { createdAt?: { gte?: Date; lte: Date } } {
  if (!period.from) {
    return { createdAt: { lte: period.to } };
  }
  return { createdAt: { gte: period.from, lte: period.to } };
}

export function dateInPeriod(period: ResolvedPeriod): { date: { gte?: Date; lte: Date } } {
  if (!period.from) {
    return { date: { lte: period.to } };
  }
  return { date: { gte: period.from, lte: period.to } };
}

/** @deprecated Use dateInPeriod */
export function expenseDateInPeriod(period: ResolvedPeriod): { date?: { gte?: Date; lte: Date } } {
  return dateInPeriod(period);
}

export function investmentDateInPeriod(period: ResolvedPeriod): { date: { gte?: Date; lte: Date } } {
  return dateInPeriod(period);
}
