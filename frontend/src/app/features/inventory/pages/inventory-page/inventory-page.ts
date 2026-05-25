import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressBarModule } from 'primeng/progressbar';
import { TableModule } from 'primeng/table';
import { MockSeedService } from '../../../../core/services/mock-seed.service';
import { StatusChip } from '../../../../shared/components/status-chip/status-chip';
import { InrPipe } from '../../../../shared/pipes/inr.pipe';

@Component({
  selector: 'app-inventory-page',
  standalone: true,
  imports: [CommonModule, ButtonModule, InputTextModule, ProgressBarModule, TableModule, StatusChip, InrPipe],
  templateUrl: './inventory-page.html',
  styleUrl: './inventory-page.scss',
})
export class InventoryPage {
  readonly search = signal('');
  readonly items = computed(() => this.seed.inventory.entities());
  readonly filtered = computed(() => {
    const query = this.search().toLowerCase();
    return this.items().filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query),
    );
  });

  constructor(private readonly seed: MockSeedService) {}

  stockValue(quantity: number, reorderLevel: number): number {
    return Math.min(100, Math.round((quantity / Math.max(reorderLevel * 2, 1)) * 100));
  }
}
