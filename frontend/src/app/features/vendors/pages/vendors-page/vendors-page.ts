import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ErpDataService } from '../../../../core/services/erp-data.service';
import { Supplier } from '../../../../models/erp.models';
import { StatusChip } from '../../../../shared/components/status-chip/status-chip';
import { TablePanelSkeleton } from '../../../../shared/components/table-panel-skeleton/table-panel-skeleton';
import { InrPipe } from '../../../../shared/pipes/inr.pipe';

@Component({
  selector: 'app-vendors-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, TableModule, StatusChip, InrPipe, TablePanelSkeleton],
  templateUrl: './vendors-page.html',
  styleUrl: './vendors-page.scss',
})
export class VendorsPage {
  private readonly data = inject(ErpDataService);

  readonly search = signal('');
  readonly loading = computed(() => this.data.suppliers.loading());
  readonly suppliers = computed(() => this.data.suppliers.entities());
  readonly filtered = computed(() => {
    const q = this.search().toLowerCase();
    return this.suppliers().filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.contact.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q),
    );
  });

  dialogOpen = false;
  newSupplier: Partial<Supplier> = this.empty();

  openAdd(): void {
    this.newSupplier = this.empty();
    this.dialogOpen = true;
  }

  save(): void {
    const data = {
      ...this.newSupplier,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Supplier;
    this.data.suppliers.save(data).subscribe(() => (this.dialogOpen = false));
  }

  private empty(): Partial<Supplier> {
    return { name: '', contact: '', phone: '', category: 'Paper rolls supplier', outstanding: 0 };
  }
}
