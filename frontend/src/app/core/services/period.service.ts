import { Injectable, computed, signal } from '@angular/core';

export const PERIOD_PRESETS = [
  'this_month',
  'last3m',
  'last6m',
  'last12m',
  'all',
  'custom',
] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

export interface PeriodMeta {
  preset: PeriodPreset;
  from: string | null;
  to: string;
  label: string;
}

export interface CustomRange {
  from: string;
  to: string;
}

const PRESET_LABELS: Record<PeriodPreset, string> = {
  this_month: 'This month',
  last3m: 'Last 3 months',
  last6m: 'Last 6 months',
  last12m: 'Last 12 months',
  all: 'All time',
  custom: 'Custom range',
};

const STORAGE_KEY = 'kprints-erp-period';
const STORAGE_CUSTOM_KEY = 'kprints-erp-period-custom';

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function isValidDateInput(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

function formatCustomLabel(from: string, to: string): string {
  if (!isValidDateInput(from) || !isValidDateInput(to)) {
    return 'Custom range';
  }
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const fromMonth = MONTH_SHORT[fm - 1] ?? '';
  const toMonth = MONTH_SHORT[tm - 1] ?? '';
  if (fy === ty) {
    return `${fd} ${fromMonth} – ${td} ${toMonth} ${ty}`;
  }
  return `${fd} ${fromMonth} ${fy} – ${td} ${toMonth} ${ty}`;
}

@Injectable({ providedIn: 'root' })
export class PeriodService {
  readonly preset = signal<PeriodPreset>(this.loadPreset());
  readonly activeMeta = signal<PeriodMeta | null>(null);

  private readonly storedCustom = this.loadCustomRange();
  readonly customFrom = signal<string>(this.storedCustom.from);
  readonly customTo = signal<string>(this.storedCustom.to);

  readonly customRangeValid = computed(() => {
    const from = this.customFrom();
    const to = this.customTo();
    return (
      isValidDateInput(from) &&
      isValidDateInput(to) &&
      new Date(from).getTime() <= new Date(to).getTime()
    );
  });

  readonly label = computed(() => {
    if (this.activeMeta()) {
      return this.activeMeta()!.label;
    }
    if (this.preset() === 'custom' && this.customRangeValid()) {
      return formatCustomLabel(this.customFrom(), this.customTo());
    }
    return PRESET_LABELS[this.preset()];
  });

  readonly salesColumnLabel = computed(() => {
    if (this.preset() === 'this_month') {
      return 'Sold this month';
    }
    return `Sold (${this.label()})`;
  });

  readonly investedColumnLabel = computed(() => {
    if (this.preset() === 'this_month') {
      return 'Invested this month';
    }
    return `Invested (${this.label()})`;
  });

  readonly queryString = computed(() => {
    const preset = this.preset();
    if (preset === 'custom' && this.customRangeValid()) {
      return `period=custom&from=${this.customFrom()}&to=${this.customTo()}`;
    }
    return `period=${preset}`;
  });

  setPreset(preset: PeriodPreset): void {
    this.preset.set(preset);
    localStorage.setItem(STORAGE_KEY, preset);
  }

  setActiveMeta(meta: PeriodMeta | null): void {
    this.activeMeta.set(meta);
  }

  setCustomRange(from: string, to: string): void {
    this.customFrom.set(from);
    this.customTo.set(to);
    if (isValidDateInput(from) && isValidDateInput(to)) {
      localStorage.setItem(STORAGE_CUSTOM_KEY, JSON.stringify({ from, to }));
    }
  }

  /** Switch to the custom preset and apply a new range in one step. */
  applyCustomRange(from: string, to: string): void {
    this.setCustomRange(from, to);
    this.setPreset('custom');
  }

  private loadPreset(): PeriodPreset {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (PERIOD_PRESETS as readonly string[]).includes(stored)) {
      return stored as PeriodPreset;
    }
    return 'last12m';
  }

  private loadCustomRange(): CustomRange {
    try {
      const raw = localStorage.getItem(STORAGE_CUSTOM_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<CustomRange>;
        if (
          parsed?.from &&
          parsed?.to &&
          isValidDateInput(parsed.from) &&
          isValidDateInput(parsed.to)
        ) {
          return { from: parsed.from, to: parsed.to };
        }
      }
    } catch {
      // ignore corrupted storage
    }
    return { from: daysAgoIso(30), to: todayIso() };
  }
}
