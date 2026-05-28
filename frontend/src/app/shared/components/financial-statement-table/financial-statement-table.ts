import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TableModule } from 'primeng/table';
import { FinancialStatementRow } from '../../../models/erp.models';
import { InrPipe } from '../../pipes/inr.pipe';
import { TablePanelSkeleton } from '../table-panel-skeleton/table-panel-skeleton';

@Component({
  selector: 'app-financial-statement-table',
  standalone: true,
  imports: [CommonModule, TableModule, InrPipe, TablePanelSkeleton],
  templateUrl: './financial-statement-table.html',
  styleUrl: './financial-statement-table.scss',
})
export class FinancialStatementTable {
  @Input({ required: true }) periods: string[] = [];
  @Input({ required: true }) rows: FinancialStatementRow[] = [];
  @Input() loading = false;
  @Input() error: string | null = null;

  percent(value: number | null): string {
    if (value === null || value === undefined || !Number.isFinite(value)) return '—';
    return `${value.toFixed(2)}%`;
  }
}

