import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DecimalPipe],
  templateUrl: './kpi-card.html',
  styleUrl: './kpi-card.scss',
})
export class KpiCard {
  @Input({ required: true }) label = '';
  @Input({ required: true }) value: number | string = '';
  @Input() icon = 'pi pi-chart-line';
  @Input() trend = '';
  @Input() tone: 'primary' | 'success' | 'warning' | 'danger' | 'accent' = 'primary';
  @Input() currency = false;

  isNumber(): boolean {
    return typeof this.value === 'number';
  }
}
