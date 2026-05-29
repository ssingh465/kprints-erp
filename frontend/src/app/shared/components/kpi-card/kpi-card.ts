import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, Input, OnChanges, signal } from '@angular/core';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DecimalPipe, SkeletonModule, ProgressBarModule],
  templateUrl: './kpi-card.html',
  styleUrl: './kpi-card.scss',
})
export class KpiCard implements OnChanges {
  @Input({ required: true }) label = '';
  @Input({ required: true }) value: number | string = '';
  @Input() icon = 'pi pi-chart-line';
  @Input() trend = '';
  @Input() delta = '';
  @Input() deltaDirection: 'up' | 'down' | 'neutral' = 'neutral';
  @Input() tone: 'primary' | 'success' | 'warning' | 'danger' | 'accent' = 'primary';
  @Input() currency = false;
  @Input() loading = false;
  @Input() showProgress = false;
  @Input() progressValue = 0;
  @Input() animateValue = true;

  readonly displayValue = signal<number | string>(0);

  private animated = false;

  ngOnChanges(): void {
    if (this.loading || !this.animateValue || !this.isNumber()) {
      this.displayValue.set(this.value);
      return;
    }

    if (typeof this.value === 'number' && !this.animated) {
      this.animateCounter(this.value);
      this.animated = true;
    } else {
      this.displayValue.set(this.value);
    }
  }

  get deltaIcon(): string {
    if (this.deltaDirection === 'up') return 'pi pi-arrow-up-right';
    if (this.deltaDirection === 'down') return 'pi pi-arrow-down-right';
    return 'pi pi-minus';
  }

  isNumber(): boolean {
    return typeof this.value === 'number';
  }

  private animateCounter(target: number): void {
    const duration = 680;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.displayValue.set(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}
