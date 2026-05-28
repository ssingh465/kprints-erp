import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import 'chart.js/auto';
import { ChartModule } from 'primeng/chart';
import { ProgressBarModule } from 'primeng/progressbar';
import { TableModule } from 'primeng/table';
import { TimelineModule } from 'primeng/timeline';
import { ApiClientService } from '../../../../core/services/api-client.service';
import { ErpDataService } from '../../../../core/services/erp-data.service';
import { PeriodService } from '../../../../core/services/period.service';
import { InventoryItem, MonthlyMetric, Order, PeriodMeta, Poster } from '../../../../models/erp.models';
import { ChartPanelSkeleton } from '../../../../shared/components/chart-panel-skeleton/chart-panel-skeleton';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { KpiCard } from '../../../../shared/components/kpi-card/kpi-card';
import { ListPanelSkeleton } from '../../../../shared/components/list-panel-skeleton/list-panel-skeleton';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { PeriodSelector } from '../../../../shared/components/period-selector/period-selector';
import { StatusChip } from '../../../../shared/components/status-chip/status-chip';
import { TablePanelSkeleton } from '../../../../shared/components/table-panel-skeleton/table-panel-skeleton';
import { InrPipe } from '../../../../shared/pipes/inr.pipe';

interface DashboardApiResponse {
  kpis: {
    revenue: number;
    collected: number;
    expenses: number;
    profit: number;
    orderCount: number;
    pendingPrintJobs: number;
    inventoryAlerts: number;
  };
  monthlyMetrics: MonthlyMetric[];
  recentOrders: Order[];
  topPosters: Poster[];
  period: PeriodMeta;
}

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
    PeriodSelector,
    PageHeader,
    EmptyState,
    ChartPanelSkeleton,
    TablePanelSkeleton,
    ListPanelSkeleton,
  ],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage implements OnInit {
  private readonly data = inject(ErpDataService);
  private readonly api = inject(ApiClientService);
  private readonly period = inject(PeriodService);

  readonly inventory = computed(() => this.data.inventory.entities());
  readonly printJobs = computed(() => this.data.printJobs.entities());

  readonly loading = signal(true);
  readonly revenue = signal(0);
  readonly orderCount = signal(0);
  readonly pendingJobs = signal(0);
  readonly inventoryAlerts = signal(0);
  readonly monthlyMetrics = signal<MonthlyMetric[]>([]);
  readonly recentOrders = signal<Order[]>([]);
  readonly topPosters = signal<Poster[]>([]);
  readonly periodLabel = computed(() => this.period.label());
  readonly salesColumnLabel = computed(() => this.period.salesColumnLabel());

  readonly kpiTrendRevenue = computed(() => `${this.periodLabel()} · revenue`);
  readonly kpiTrendOrders = computed(() => `${this.periodLabel()} · orders`);

  readonly pendingJobProgress = computed(() => {
    const pending = this.pendingJobs();
    return pending > 0 ? Math.min((pending / 12) * 100, 100) : 0;
  });

  readonly lowStockItems = computed(() =>
    this.inventory().filter((item) => item.quantity <= item.reorderLevel),
  );

  readonly revenueChart = computed(() => ({
    labels: this.monthlyMetrics().map((metric) => metric.month),
    datasets: [
      {
        label: 'Revenue',
        data: this.monthlyMetrics().map((metric) => metric.revenue),
        borderColor: '#6366f1',
        backgroundColor: (context: { chart: { ctx: CanvasRenderingContext2D; chartArea?: { top: number; bottom: number } } }) => {
          const { ctx, chartArea } = context.chart;
          if (!chartArea) return 'rgba(99, 102, 241, 0.12)';
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(99, 102, 241, 0.22)');
          gradient.addColorStop(1, 'rgba(99, 102, 241, 0.02)');
          return gradient;
        },
        fill: true,
        tension: 0.42,
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 5,
      },
      {
        label: 'Expenses',
        data: this.monthlyMetrics().map((metric) => metric.expenses),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        fill: true,
        tension: 0.42,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
      },
    ],
  }));

  readonly orderChart = computed(() => ({
    labels: this.monthlyMetrics().map((metric) => metric.month),
    datasets: [
      {
        label: 'Orders',
        data: this.monthlyMetrics().map((metric) => metric.orders),
        backgroundColor: '#818cf8',
        hoverBackgroundColor: '#6366f1',
        borderRadius: 8,
        borderSkipped: false,
        maxBarThickness: 36,
      },
    ],
  }));

  readonly lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' as const },
    plugins: {
      legend: {
        labels: {
          boxWidth: 8,
          usePointStyle: true,
          padding: 16,
          font: { size: 12, weight: '600' as const },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        padding: 12,
        cornerRadius: 8,
        titleFont: { size: 12, weight: '700' as const },
        bodyFont: { size: 12 },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(100, 116, 139, 0.12)', drawBorder: false },
        ticks: { font: { size: 11 }, padding: 8 },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 }, padding: 8 },
      },
    },
  };

  readonly barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(100, 116, 139, 0.12)', drawBorder: false },
        ticks: { font: { size: 11 }, stepSize: 1 },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 } },
      },
    },
  };

  readonly timeline = [
    { status: 'Design Approved', detail: 'ORD-1048 moved to printing queue' },
    { status: 'Packaging', detail: 'ORD-1049 packed for website shipment' },
    { status: 'Low Stock', detail: 'Cyan Ink 1L needs purchase approval' },
    { status: 'Delivered', detail: 'ORD-1051 delivered in Jaipur' },
  ];

  ngOnInit(): void {
    this.loadDashboard();
  }

  onPeriodChange(): void {
    this.loadDashboard();
  }

  stockPercent(item: InventoryItem): number {
    if (!item.reorderLevel) return 0;
    return Math.min((item.quantity / item.reorderLevel) * 100, 100);
  }

  private loadDashboard(): void {
    this.loading.set(true);
    this.api.get<DashboardApiResponse>(`/dashboard?${this.period.queryString()}`).subscribe({
      next: (payload) => {
        this.revenue.set(payload.kpis.revenue);
        this.orderCount.set(payload.kpis.orderCount);
        this.pendingJobs.set(payload.kpis.pendingPrintJobs);
        this.inventoryAlerts.set(payload.kpis.inventoryAlerts);
        this.monthlyMetrics.set(payload.monthlyMetrics);
        this.recentOrders.set(payload.recentOrders ?? []);
        this.topPosters.set(payload.topPosters ?? []);
        this.period.setActiveMeta(payload.period);
        this.loading.set(false);
      },
      error: () => {
        this.pendingJobs.set(
          this.printJobs().filter((job) => job.stage !== 'Delivered' && job.stage !== 'Cancelled').length,
        );
        this.inventoryAlerts.set(this.lowStockItems().length);
        this.loading.set(false);
      },
    });
  }
}
