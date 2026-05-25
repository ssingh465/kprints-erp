import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './reports-page.html',
  styleUrl: './reports-page.scss',
})
export class ReportsPage {
  readonly reports = [
    ['Sales by channel', 'Offline, website, and marketplace split'],
    ['Production SLA', 'Stage-wise aging and delayed orders'],
    ['Inventory valuation', 'Stock value, reorder exceptions, material usage'],
    ['Poster performance', 'Top posters, category revenue, dead stock'],
    ['Expense summary', 'Monthly expense categories and vendor spend'],
    ['Shipment aging', 'Packed, in transit, delayed, and delivered orders'],
  ];
}
