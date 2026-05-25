import { CommonModule } from '@angular/common';
import { Component, computed } from '@angular/core';
import 'chart.js/auto';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { MockSeedService } from '../../../../core/services/mock-seed.service';
import { KpiCard } from '../../../../shared/components/kpi-card/kpi-card';
import { InrPipe } from '../../../../shared/pipes/inr.pipe';

@Component({
  selector: 'app-finance-page',
  standalone: true,
  imports: [CommonModule, ChartModule, TableModule, KpiCard, InrPipe],
  templateUrl: './finance-page.html',
  styleUrl: './finance-page.scss',
})
export class FinancePage {
  readonly orders = computed(() => this.seed.orders.entities());
  readonly expenses = computed(() => this.seed.expenses.entities());
  readonly metrics = computed(() => this.seed.monthlyMetrics.entities());
  readonly revenue = computed(() => this.orders().reduce((sum, order) => sum + order.total, 0));
  readonly paid = computed(() => this.orders().reduce((sum, order) => sum + order.paid, 0));
  readonly expenseTotal = computed(() => this.expenses().reduce((sum, expense) => sum + expense.amount, 0));
  readonly profit = computed(() => this.revenue() - this.expenseTotal());

  readonly pnlChart = computed(() => ({
    labels: this.metrics().map((metric) => metric.month),
    datasets: [
      { label: 'Revenue', data: this.metrics().map((metric) => metric.revenue), backgroundColor: '#126c78' },
      { label: 'Expenses', data: this.metrics().map((metric) => metric.expenses), backgroundColor: '#b7791f' },
    ],
  }));

  readonly chartOptions = { responsive: true, maintainAspectRatio: false };

  constructor(private readonly seed: MockSeedService) {}
}
