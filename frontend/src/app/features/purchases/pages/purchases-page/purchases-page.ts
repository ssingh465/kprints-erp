import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ApiClientService } from '../../../../core/services/api-client.service';
import { PeriodService } from '../../../../core/services/period.service';
import { Expense, ExpenseListResponse } from '../../../../models/erp.models';
import { PeriodSelector } from '../../../../shared/components/period-selector/period-selector';
import { StatusChip } from '../../../../shared/components/status-chip/status-chip';
import { TablePanelSkeleton } from '../../../../shared/components/table-panel-skeleton/table-panel-skeleton';
import { InrPipe } from '../../../../shared/pipes/inr.pipe';

@Component({
  selector: 'app-purchases-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    TableModule,
    StatusChip,
    InrPipe,
    PeriodSelector,
    TablePanelSkeleton,
  ],
  templateUrl: './purchases-page.html',
  styleUrl: './purchases-page.scss',
})
export class PurchasesPage implements OnInit {
  private readonly api = inject(ApiClientService);
  private readonly route = inject(ActivatedRoute);
  private readonly period = inject(PeriodService);

  readonly search = signal('');
  readonly expenses = signal<Expense[]>([]);
  readonly loading = signal(false);
  readonly periodLabel = computed(() => this.period.label());

  readonly filtered = computed(() => {
    const q = this.search().toLowerCase();
    return this.expenses().filter(
      (e) => !q || e.vendor.toLowerCase().includes(q) || e.category.toLowerCase().includes(q),
    );
  });

  readonly expenseCategoryOptions = [
    { label: 'Materials & Inventory', value: 'Materials' },
    { label: 'Logistics & Packaging', value: 'Logistics' },
    { label: 'Operations Salaries', value: 'Salaries' },
    { label: 'Marketing / Ads', value: 'Marketing' },
    { label: 'Utilities & Rent', value: 'Utilities' },
  ];
  readonly paymentModes = ['UPI', 'Cash', 'Card', 'Bank Transfer'];

  dialogOpen = false;
  newExpense = this.empty();

  ngOnInit(): void {
    this.loadExpenses();
    this.route.queryParams.subscribe((params) => {
      if (params['new'] === 'true') {
        this.openAdd();
      }
    });
  }

  onPeriodChange(): void {
    this.loadExpenses();
  }

  private loadExpenses(): void {
    this.loading.set(true);
    this.api.get<ExpenseListResponse>(`/expenses?limit=500&${this.period.queryString()}`).subscribe({
      next: (result) => {
        this.expenses.set(result.items);
        this.period.setActiveMeta(result.period);
        this.loading.set(false);
      },
      error: () => {
        this.expenses.set([]);
        this.loading.set(false);
      },
    });
  }

  openAdd(): void {
    this.newExpense = this.empty();
    this.dialogOpen = true;
  }

  save(): void {
    const payload = {
      date: new Date(this.newExpense.date).toISOString(),
      category: this.newExpense.category,
      vendor: this.newExpense.vendor,
      amount: this.newExpense.amount,
      paymentMode: this.newExpense.paymentMode,
      notes: this.newExpense.notes || '',
    };

    this.api.post<Expense>('/expenses', payload).subscribe({
      next: () => {
        this.loadExpenses();
        this.dialogOpen = false;
      },
    });
  }

  remove(expense: Expense): void {
    this.api.delete(`/expenses/${expense.id}`).subscribe({
      next: () => this.loadExpenses(),
    });
  }

  private empty() {
    return {
      date: new Date().toISOString().split('T')[0],
      category: 'Materials',
      vendor: '',
      amount: 500,
      paymentMode: 'UPI' as const,
      notes: '',
    };
  }
}
