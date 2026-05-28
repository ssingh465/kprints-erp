import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface ReportCard {
  title: string;
  description: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './reports-page.html',
  styleUrl: './reports-page.scss',
})
export class ReportsPage {
  readonly reports: ReportCard[] = [
    {
      title: 'Financial Statements',
      description: 'Quarterly results, profit & loss, balance sheet, and cash flow',
      route: '/reports/financial-statements',
      icon: 'pi pi-table',
    },
  ];
}
