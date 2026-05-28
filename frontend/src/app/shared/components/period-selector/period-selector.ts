import { Component, computed, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { PERIOD_PRESETS, PeriodPreset, PeriodService } from '../../../core/services/period.service';

const PRESET_LABEL: Record<PeriodPreset, string> = {
  this_month: 'This month',
  last3m: 'Last 3 months',
  last6m: 'Last 6 months',
  last12m: 'Last 12 months',
  all: 'All time',
  custom: 'Custom',
};

@Component({
  selector: 'app-period-selector',
  standalone: true,
  imports: [FormsModule, SelectModule],
  template: `
    <div class="period-selector">
      <label for="periodPreset" class="period-label">Period</label>
      <p-select
        inputId="periodPreset"
        [options]="options"
        optionLabel="label"
        optionValue="value"
        styleClass="w-full"
        appendTo="body"
        [ngModel]="period.preset()"
        (ngModelChange)="onPresetChange($event)"
      />

      @if (period.preset() === 'custom') {
        <div class="custom-range">
          <div class="custom-range-field">
            <label for="periodFrom">From</label>
            <input
              id="periodFrom"
              type="date"
              class="period-date"
              [max]="period.customTo()"
              [ngModel]="period.customFrom()"
              (ngModelChange)="onFromChange($event)"
            />
          </div>
          <div class="custom-range-field">
            <label for="periodTo">To</label>
            <input
              id="periodTo"
              type="date"
              class="period-date"
              [min]="period.customFrom()"
              [max]="todayIso"
              [ngModel]="period.customTo()"
              (ngModelChange)="onToChange($event)"
            />
          </div>
          @if (!period.customRangeValid()) {
            <small class="period-error">Pick a valid range (From must be on or before To).</small>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .period-selector {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      min-width: 10.5rem;
      position: relative;
      z-index: 20;
    }

    .period-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--app-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .period-date {
      width: 100%;
      min-height: 2.5rem;
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--app-border);
      background: var(--app-surface);
      color: var(--app-text);
      font-size: 0.9rem;
      transition: box-shadow var(--motion-fast) var(--ease-out);
    }

    .period-date:focus {
      outline: none;
      box-shadow: 0 0 0 3px var(--focus-ring);
    }

    .custom-range {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      margin-top: 0.25rem;
    }

    .custom-range-field {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .custom-range-field label {
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--app-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .period-error {
      font-size: 0.72rem;
      color: var(--app-danger, #c0392b);
    }

    @media (min-width: 540px) {
      .custom-range {
        flex-direction: row;
        align-items: flex-end;
      }

      .custom-range-field {
        flex: 1;
        min-width: 9rem;
      }

      .period-error {
        flex-basis: 100%;
      }
    }
  `,
})
export class PeriodSelector {
  readonly period = inject(PeriodService);

  readonly periodChange = output<PeriodPreset>();

  readonly options = PERIOD_PRESETS.map((value) => ({
    value,
    label: PRESET_LABEL[value],
  }));

  readonly todayIso = new Date().toISOString().slice(0, 10);

  readonly canEmitCustom = computed(() => this.period.customRangeValid());

  onPresetChange(preset: PeriodPreset): void {
    this.period.setPreset(preset);
    if (preset === 'custom') {
      // Only emit when the existing range is already valid; otherwise wait for the
      // user to finish picking dates so we don't fire a request against an empty range.
      if (this.period.customRangeValid()) {
        this.periodChange.emit(preset);
      }
      return;
    }
    this.periodChange.emit(preset);
  }

  onFromChange(value: string): void {
    this.period.setCustomRange(value, this.period.customTo());
    this.emitIfCustomValid();
  }

  onToChange(value: string): void {
    this.period.setCustomRange(this.period.customFrom(), value);
    this.emitIfCustomValid();
  }

  private emitIfCustomValid(): void {
    if (this.period.preset() !== 'custom') {
      this.period.setPreset('custom');
    }
    if (this.period.customRangeValid()) {
      this.periodChange.emit('custom');
    }
  }
}
