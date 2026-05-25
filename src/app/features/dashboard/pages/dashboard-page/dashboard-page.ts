import { CommonModule } from '@angular/common';
import { Component, computed } from '@angular/core';
import 'chart.js/auto';
import { ChartModule } from 'primeng/chart';
import { ProgressBarModule } from 'primeng/progressbar';
import { TableModule } from 'primeng/table';
import { TimelineModule } from 'primeng/timeline';
import { KpiCard } from '../../../../shared/components/kpi-card/kpi-card';
import { StatusChip } from '../../../../shared/components/status-chip/status-chip';
import { InrPipe } from '../../../../shared/pipes/inr.pipe';
import { MockSeedService } from '../../../../core/services/mock-seed.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    ChartModule,
    ProgressBarModule,
    TableModule,
    TimelineModule,
    KpiCard,
    StatusChip,
    InrPipe,
  ],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage {
  readonly orders = computed(() => this.seed.orders.entities());
  readonly inventory = computed(() => this.seed.inventory.entities());
  readonly posters = computed(() => this.seed.posters.entities());
  readonly printJobs = computed(() => this.seed.printJobs.entities());
  readonly shipments = computed(() => this.seed.shipments.entities());
  readonly expenses = computed(() => this.seed.expenses.entities());
  readonly monthlyMetrics = computed(() => this.seed.monthlyMetrics.entities());

  readonly revenue = computed(() => this.orders().reduce((sum, order) => sum + order.total, 0));
  readonly expenseTotal = computed(() => this.expenses().reduce((sum, expense) => sum + expense.amount, 0));
  readonly pendingJobs = computed(
    () => this.printJobs().filter((job) => job.stage !== 'Delivered' && job.stage !== 'Cancelled').length,
  );
  readonly lowStockItems = computed(() =>
    this.inventory().filter((item) => item.quantity <= item.reorderLevel),
  );
  readonly topPosters = computed(() =>
    [...this.posters()].sort((a, b) => b.soldThisMonth - a.soldThisMonth).slice(0, 4),
  );

  readonly revenueChart = computed(() => ({
    labels: this.monthlyMetrics().map((metric) => metric.month),
    datasets: [
      {
        label: 'Revenue',
        data: this.monthlyMetrics().map((metric) => metric.revenue),
        borderColor: '#126c78',
        backgroundColor: 'rgba(18, 108, 120, 0.16)',
        fill: true,
        tension: 0.38,
      },
      {
        label: 'Expenses',
        data: this.monthlyMetrics().map((metric) => metric.expenses),
        borderColor: '#b7791f',
        backgroundColor: 'rgba(183, 121, 31, 0.12)',
        fill: true,
        tension: 0.38,
      },
    ],
  }));

  readonly orderChart = computed(() => ({
    labels: this.monthlyMetrics().map((metric) => metric.month),
    datasets: [
      {
        label: 'Orders',
        data: this.monthlyMetrics().map((metric) => metric.orders),
        backgroundColor: '#4657d7',
        borderRadius: 6,
      },
    ],
  }));

  readonly chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          boxWidth: 10,
          usePointStyle: true,
        },
      },
    },
    scales: {
      y: {
        grid: {
          color: 'rgba(101, 116, 139, 0.16)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  readonly timeline = [
    { status: 'Design Approved', detail: 'ORD-1048 moved to printing queue' },
    { status: 'Packaging', detail: 'ORD-1049 packed for website shipment' },
    { status: 'Low Stock', detail: 'Cyan Ink 1L needs purchase approval' },
    { status: 'Delivered', detail: 'ORD-1051 delivered in Jaipur' },
  ];

  constructor(private readonly seed: MockSeedService) {}
}
