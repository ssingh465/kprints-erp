import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ApiClientService } from '../../../../core/services/api-client.service';
import { ErpDataService } from '../../../../core/services/erp-data.service';
import { InventoryCategory, InventoryItem } from '../../../../models/erp.models';
import { StatusChip } from '../../../../shared/components/status-chip/status-chip';
import { TablePanelSkeleton } from '../../../../shared/components/table-panel-skeleton/table-panel-skeleton';
import { InrPipe } from '../../../../shared/pipes/inr.pipe';

@Component({
  selector: 'app-inventory-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    ProgressBarModule,
    SelectModule,
    TableModule,
    StatusChip,
    InrPipe,
    TablePanelSkeleton,
  ],
  templateUrl: './inventory-page.html',
  styleUrl: './inventory-page.scss',
})
export class InventoryPage {
  private readonly data = inject(ErpDataService);
  private readonly api = inject(ApiClientService);

  readonly categories: InventoryCategory[] = [
    'Poster Stock',
    'Paper Rolls',
    'Ink',
    'Frames',
    'Lamination Sheets',
    'Packaging Material',
    'Accessories',
  ];

  readonly search = signal('');
  readonly loading = computed(() => this.data.inventory.loading());
  readonly saveError = signal<string | null>(null);
  readonly items = computed(() => this.data.inventory.entities());
  readonly suppliers = computed(() => this.data.suppliers.entities());
  readonly supplierOptions = computed(() =>
    this.suppliers().map((supplier) => ({
      label: supplier.name,
      value: supplier.id,
    })),
  );
  readonly itemOptions = computed(() =>
    this.items().map((item) => ({
      label: `${item.name} (${item.quantity} ${item.unit})`,
      value: item.id,
    })),
  );
  readonly directionOptions = [
    { label: 'Stock in (+)', value: 'In' },
    { label: 'Stock out (-)', value: 'Out' },
  ];
  readonly filtered = computed(() => {
    const query = this.search().toLowerCase();
    return this.items().filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query),
    );
  });

  addItemOpen = false;
  stockMovementOpen = false;
  newItem = this.emptyItem();
  movement = this.emptyMovement();

  stockValue(quantity: number, reorderLevel: number): number {
    return Math.min(100, Math.round((quantity / Math.max(reorderLevel * 2, 1)) * 100));
  }

  openAddItem(): void {
    this.saveError.set(null);
    this.newItem = this.emptyItem();
    const list = this.suppliers();
    if (list.length > 0) {
      this.newItem.supplierId = list[0].id;
    }
    this.addItemOpen = true;
  }

  saveItem(): void {
    this.saveError.set(null);
    if (!this.newItem.supplierId) {
      this.saveError.set('Add at least one vendor before creating inventory materials.');
      return;
    }

    const payload = {
      sku: this.newItem.sku!.trim(),
      name: this.newItem.name!.trim(),
      category: this.newItem.category!,
      supplierId: this.newItem.supplierId,
      unit: this.newItem.unit!.trim(),
      quantity: Number(this.newItem.quantity) || 0,
      reorderLevel: Number(this.newItem.reorderLevel) || 0,
      unitCost: Number(this.newItem.unitCost) || 0,
    };

    this.api.post<InventoryItem>('/inventory', payload).subscribe({
      next: () => {
        this.data.inventory.refresh();
        this.addItemOpen = false;
      },
      error: (err) => this.saveError.set(err?.message || 'Failed to add inventory item'),
    });
  }

  openStockMovement(): void {
    this.saveError.set(null);
    this.movement = this.emptyMovement();
    const list = this.items();
    if (list.length > 0) {
      this.movement.itemId = list[0].id;
    }
    this.stockMovementOpen = true;
  }

  saveStockMovement(): void {
    this.saveError.set(null);
    const item = this.items().find((i) => i.id === this.movement.itemId);
    if (!item) {
      this.saveError.set('Select an inventory item or add a material first.');
      return;
    }

    const delta = this.movement.direction === 'In' ? this.movement.quantity : -this.movement.quantity;
    const notes = this.movement.notes.trim();

    this.api
      .post(`/inventory/${item.id}/movements`, {
        quantity: delta,
        type: this.movement.direction === 'In' ? 'Purchase' : 'Consumption',
        notes,
      })
      .subscribe({
        next: () => {
          this.data.inventory.refresh();
          this.stockMovementOpen = false;
        },
        error: (err) => this.saveError.set(err?.message || 'Failed to save stock movement'),
      });
  }

  private emptyItem(): Partial<InventoryItem> {
    return {
      sku: '',
      name: '',
      category: 'Paper Rolls',
      supplierId: '',
      unit: 'roll',
      quantity: 0,
      reorderLevel: 10,
      unitCost: 0,
    };
  }

  private emptyMovement() {
    return {
      itemId: '',
      direction: 'In' as 'In' | 'Out',
      quantity: 10,
      notes: 'Standard stock adjustment',
    };
  }
}
