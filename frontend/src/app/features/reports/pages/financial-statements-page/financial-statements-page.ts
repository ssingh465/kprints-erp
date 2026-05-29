import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TabsModule } from 'primeng/tabs';
import { MessageModule } from 'primeng/message';
import { ApiClientService } from '../../../../core/services/api-client.service';
import { FinancialStatement } from '../../../../models/erp.models';
import { FinancialStatementTable } from '../../../../shared/components/financial-statement-table/financial-statement-table';

@Component({
  selector: 'app-financial-statements-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TabsModule,
    MessageModule,
    FinancialStatementTable,
  ],
  templateUrl: './financial-statements-page.html',
  styleUrl: './financial-statements-page.scss',
})
export class FinancialStatementsPage implements OnInit {
  private readonly api = inject(ApiClientService);

  readonly quarterlyLoading = signal(true);
  readonly quarterlyError = signal<string | null>(null);
  readonly quarterly = signal<FinancialStatement | null>(null);

  readonly pnlLoading = signal(true);
  readonly pnlError = signal<string | null>(null);
  readonly pnl = signal<FinancialStatement | null>(null);

  readonly balanceSheetLoading = signal(true);
  readonly balanceSheetError = signal<string | null>(null);
  readonly balanceSheet = signal<FinancialStatement | null>(null);

  readonly cashFlowLoading = signal(true);
  readonly cashFlowError = signal<string | null>(null);
  readonly cashFlow = signal<FinancialStatement | null>(null);

  ngOnInit(): void {
    this.loadQuarterly();
    this.loadPnl();
    this.loadBalanceSheet();
    this.loadCashFlow();
  }

  private apiErrorMessage(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
      return (err.error as { message?: string })?.message || err.message || fallback;
    }
    if (err instanceof Error) {
      return err.message;
    }
    return fallback;
  }

  private loadQuarterly(): void {
    this.quarterlyLoading.set(true);
    this.quarterlyError.set(null);
    this.api.get<FinancialStatement>('/reports/financial/quarterly').subscribe({
      next: (data) => {
        this.quarterly.set(data);
        this.quarterlyLoading.set(false);
      },
      error: (err) => {
        this.quarterlyLoading.set(false);
        this.quarterlyError.set(this.apiErrorMessage(err, 'Failed to load quarterly results.'));
      },
    });
  }

  private loadPnl(): void {
    this.pnlLoading.set(true);
    this.pnlError.set(null);
    this.api.get<FinancialStatement>('/reports/financial/pnl').subscribe({
      next: (data) => {
        this.pnl.set(data);
        this.pnlLoading.set(false);
      },
      error: (err) => {
        this.pnlLoading.set(false);
        this.pnlError.set(this.apiErrorMessage(err, 'Failed to load profit & loss.'));
      },
    });
  }

  private loadBalanceSheet(): void {
    this.balanceSheetLoading.set(true);
    this.balanceSheetError.set(null);
    this.api.get<FinancialStatement>('/reports/financial/balance-sheet').subscribe({
      next: (data) => {
        this.balanceSheet.set(data);
        this.balanceSheetLoading.set(false);
      },
      error: (err) => {
        this.balanceSheetLoading.set(false);
        this.balanceSheetError.set(this.apiErrorMessage(err, 'Failed to load balance sheet.'));
      },
    });
  }

  private loadCashFlow(): void {
    this.cashFlowLoading.set(true);
    this.cashFlowError.set(null);
    this.api.get<FinancialStatement>('/reports/financial/cash-flow').subscribe({
      next: (data) => {
        this.cashFlow.set(data);
        this.cashFlowLoading.set(false);
      },
      error: (err) => {
        this.cashFlowLoading.set(false);
        this.cashFlowError.set(this.apiErrorMessage(err, 'Failed to load cash flow.'));
      },
    });
  }
}
