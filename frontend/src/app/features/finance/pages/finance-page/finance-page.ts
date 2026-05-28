import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import 'chart.js/auto';
import { ChartModule } from 'primeng/chart';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ApiClientService } from '../../../../core/services/api-client.service';
import { PeriodService } from '../../../../core/services/period.service';
import { ChartPanelSkeleton } from '../../../../shared/components/chart-panel-skeleton/chart-panel-skeleton';
import { KpiCard } from '../../../../shared/components/kpi-card/kpi-card';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { PeriodSelector } from '../../../../shared/components/period-selector/period-selector';
import { TablePanelSkeleton } from '../../../../shared/components/table-panel-skeleton/table-panel-skeleton';
import { InrPipe } from '../../../../shared/pipes/inr.pipe';
import {
  Expense,
  ExpenseListResponse,
  FinanceSummary,
  MonthlyMetric,
  MonthlyMetricsResponse,
  Partner,
  PartnerListResponse,
  ProfitDistribution,
} from '../../../../models/erp.models';

@Component({
  selector: 'app-finance-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ChartModule,
    SelectModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    MessageModule,
    KpiCard,
    PageHeader,
    InrPipe,
    PeriodSelector,
    ChartPanelSkeleton,
    TablePanelSkeleton,
  ],
  templateUrl: './finance-page.html',
  styleUrl: './finance-page.scss',
})
export class FinancePage implements OnInit {
  private readonly api = inject(ApiClientService);
  private readonly period = inject(PeriodService);

  private apiErrorMessage(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
      return (err.error as { message?: string })?.message || err.message || fallback;
    }
    if (err instanceof Error) {
      return err.message;
    }
    return fallback;
  }

  readonly summaryLoading = signal(true);
  readonly chartsLoading = signal(true);
  readonly expensesLoading = signal(true);
  readonly summaryError = signal<string | null>(null);
  readonly summary = signal<FinanceSummary | null>(null);
  readonly monthlyMetrics = signal<MonthlyMetric[]>([]);
  readonly expenses = signal<Expense[]>([]);
  readonly periodLabel = computed(() => this.period.label());

  readonly revenue = computed(() => this.summary()?.revenue ?? 0);
  readonly paid = computed(() => this.summary()?.collected ?? 0);
  readonly expenseTotal = computed(() => this.summary()?.expenses ?? 0);
  readonly profit = computed(() => this.summary()?.profit ?? 0);

  readonly partners = signal<Partner[]>([]);
  readonly distribution = signal<ProfitDistribution | null>(null);
  readonly partnersLoading = signal(false);
  readonly partnersError = signal<string | null>(null);
  readonly formError = signal<string | null>(null);

  readonly totalSharePercent = computed(() =>
    this.partners().reduce((sum, partner) => sum + partner.profitSharePercent, 0),
  );

  readonly sharesValid = computed(() => Math.abs(this.totalSharePercent() - 100) < 0.01);

  readonly partnerTableRows = computed(() => {
    const distByPartner = new Map(
      (this.distribution()?.partners ?? []).map((line) => [line.partnerId, line.distributionAmount]),
    );
    return this.partners().map((partner) => ({
      id: partner.id,
      partner,
      distributionAmount: distByPartner.get(partner.id) ?? 0,
    }));
  });

  readonly partnerOptions = computed(() =>
    this.partners().map((partner) => ({
      label: partner.name,
      value: partner.id,
    })),
  );

  readonly pnlChart = computed(() => ({
    labels: this.monthlyMetrics().map((metric) => metric.month),
    datasets: [
      { label: 'Revenue', data: this.monthlyMetrics().map((metric) => metric.revenue), backgroundColor: '#126c78' },
      { label: 'Expenses', data: this.monthlyMetrics().map((metric) => metric.expenses), backgroundColor: '#b7791f' },
    ],
  }));

  readonly chartOptions = { responsive: true, maintainAspectRatio: false };

  partnerDialogOpen = false;
  investmentDialogOpen = false;
  editingPartnerId: string | null = null;

  partnerForm = { name: '', profitSharePercent: 0 };
  investmentForm = {
    partnerId: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    notes: '',
  };

  ngOnInit(): void {
    this.loadFinanceData();
    this.loadPartners();
  }

  onPeriodChange(): void {
    this.loadFinanceData();
    this.loadPartners();
  }

  loadFinanceData(): void {
    const qs = this.period.queryString();
    this.summaryLoading.set(true);
    this.chartsLoading.set(true);
    this.expensesLoading.set(true);
    this.summaryError.set(null);

    this.api.get<FinanceSummary>(`/finance/summary?${qs}`).subscribe({
      next: (data) => {
        this.summary.set(data);
        this.period.setActiveMeta(data.period);
        this.summaryLoading.set(false);
      },
      error: (err) => {
        this.summaryLoading.set(false);
        this.summaryError.set(this.apiErrorMessage(err, 'Failed to load finance summary.'));
      },
    });

    this.api.get<MonthlyMetricsResponse>(`/monthly-metrics?${qs}`).subscribe({
      next: (result) => {
        this.monthlyMetrics.set(result.metrics);
        this.period.setActiveMeta(result.period);
        this.chartsLoading.set(false);
      },
      error: () => {
        this.monthlyMetrics.set([]);
        this.chartsLoading.set(false);
      },
    });

    this.api.get<ExpenseListResponse>(`/expenses?limit=500&${qs}`).subscribe({
      next: (result) => {
        this.expenses.set(result.items);
        this.period.setActiveMeta(result.period);
        this.expensesLoading.set(false);
      },
      error: () => {
        this.expenses.set([]);
        this.expensesLoading.set(false);
      },
    });
  }

  loadPartners(): void {
    this.partnersLoading.set(true);
    this.partnersError.set(null);

    this.api.get<PartnerListResponse>(`/partners?${this.period.queryString()}`).subscribe({
      next: (result) => {
        this.partners.set(result.items);
        this.period.setActiveMeta(result.period);
        this.partnersLoading.set(false);
        this.refreshDistribution();
      },
      error: (err) => {
        this.partnersLoading.set(false);
        this.partnersError.set(this.apiErrorMessage(err, 'Failed to load partner investments.'));
      },
    });
  }

  refreshDistribution(): void {
    this.api
      .get<ProfitDistribution>(`/partners/distribution?${this.period.queryString()}`)
      .subscribe({
        next: (data) => {
          this.distribution.set(data);
          this.period.setActiveMeta(data.period);
        },
        error: () => this.distribution.set(null),
      });
  }

  openPartnerDialog(partner?: Partner): void {
    this.formError.set(null);
    if (partner) {
      this.editingPartnerId = partner.id;
      this.partnerForm = {
        name: partner.name,
        profitSharePercent: partner.profitSharePercent,
      };
    } else {
      this.editingPartnerId = null;
      this.partnerForm = { name: '', profitSharePercent: 0 };
    }
    this.partnerDialogOpen = true;
  }

  savePartner(): void {
    this.formError.set(null);
    const payload = {
      name: this.partnerForm.name.trim(),
      profitSharePercent: Number(this.partnerForm.profitSharePercent),
    };

    const request$ = this.editingPartnerId
      ? this.api.put<Partner>(`/partners/${this.editingPartnerId}`, payload)
      : this.api.post<Partner>('/partners', payload);

    request$.subscribe({
      next: () => {
        this.partnerDialogOpen = false;
        this.loadPartners();
      },
      error: (err) => {
        this.formError.set(this.apiErrorMessage(err, 'Could not save partner.'));
      },
    });
  }

  deletePartner(partner: Partner): void {
    if (!confirm(`Delete partner "${partner.name}" and all their investments?`)) {
      return;
    }

    this.api.delete(`/partners/${partner.id}`).subscribe({
      next: () => this.loadPartners(),
      error: (err) => {
        this.partnersError.set(this.apiErrorMessage(err, 'Failed to delete partner.'));
      },
    });
  }

  openInvestmentDialog(partner?: Partner): void {
    this.formError.set(null);
    const list = this.partners();
    this.investmentForm = {
      partnerId: partner?.id || list[0]?.id || '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      notes: '',
    };
    this.investmentDialogOpen = true;
  }

  saveInvestment(): void {
    this.formError.set(null);
    const partnerId = this.investmentForm.partnerId;
    if (!partnerId) {
      this.formError.set('Select a partner for this investment.');
      return;
    }

    this.api
      .post(`/partners/${partnerId}/investments`, {
        amount: Number(this.investmentForm.amount),
        date: this.investmentForm.date,
        notes: this.investmentForm.notes || undefined,
      })
      .subscribe({
        next: () => {
          this.investmentDialogOpen = false;
          this.loadPartners();
        },
        error: (err) => {
          this.formError.set(this.apiErrorMessage(err, 'Could not record investment.'));
        },
      });
  }

  deleteInvestment(partnerId: string, investmentId: string): void {
    if (!confirm('Remove this investment entry?')) {
      return;
    }

    this.api.delete(`/partners/${partnerId}/investments/${investmentId}`).subscribe({
      next: () => this.loadPartners(),
      error: (err) => {
        this.partnersError.set(this.apiErrorMessage(err, 'Failed to delete investment.'));
      },
    });
  }
}
