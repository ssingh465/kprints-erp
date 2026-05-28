import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ErpDataService } from '../../../../core/services/erp-data.service';
import { Coupon } from '../../../../models/erp.models';
import { StatusChip } from '../../../../shared/components/status-chip/status-chip';
import { TablePanelSkeleton } from '../../../../shared/components/table-panel-skeleton/table-panel-skeleton';

@Component({
  selector: 'app-coupons-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, TableModule, StatusChip, TablePanelSkeleton],
  templateUrl: './coupons-page.html',
  styleUrl: './coupons-page.scss',
})
export class CouponsPage {
  private readonly data = inject(ErpDataService);

  readonly search = signal('');
  readonly loading = computed(() => this.data.coupons.loading());
  readonly coupons = computed(() => this.data.coupons.entities());
  readonly filtered = computed(() => {
    const q = this.search().toLowerCase();
    return this.coupons().filter((c) => !q || c.code.toLowerCase().includes(q));
  });

  dialogOpen = false;
  newCoupon: Partial<Coupon> = this.empty();

  openAdd(): void {
    this.newCoupon = this.empty();
    this.dialogOpen = true;
  }

  save(): void {
    const data = {
      ...this.newCoupon,
      code: (this.newCoupon.code || '').toUpperCase(),
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Coupon;
    this.data.coupons.save(data).subscribe(() => (this.dialogOpen = false));
  }

  toggleActive(coupon: Coupon): void {
    const updated = { ...coupon, active: !coupon.active, updatedAt: new Date().toISOString() };
    this.data.coupons.save(updated).subscribe();
  }

  private empty(): Partial<Coupon> {
    return { code: '', discount: 10, active: true };
  }
}
