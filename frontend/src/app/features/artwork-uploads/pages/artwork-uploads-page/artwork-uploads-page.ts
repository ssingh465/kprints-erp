import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { ApiClientService } from '../../../../core/services/api-client.service';
import { ErpDataService } from '../../../../core/services/erp-data.service';
import { ArtworkUpload, Order } from '../../../../models/erp.models';
import { TablePanelSkeleton } from '../../../../shared/components/table-panel-skeleton/table-panel-skeleton';

@Component({
  selector: 'app-artwork-uploads-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, SelectModule, TableModule, TooltipModule, TablePanelSkeleton],
  templateUrl: './artwork-uploads-page.html',
  styleUrl: './artwork-uploads-page.scss',
})
export class ArtworkUploadsPage {
  private readonly data = inject(ErpDataService);
  private readonly api = inject(ApiClientService);

  readonly search = signal('');
  readonly loading = computed(() => this.data.artworks.loading() || this.data.orders.loading());
  readonly artworks = computed(() => this.data.artworks.entities());
  readonly orders = computed(() => this.data.orders.entities());
  readonly orderOptions = computed(() =>
    this.orders().map((order) => ({
      label: this.orderLabel(order),
      value: order.id,
    })),
  );
  readonly filtered = computed(() => {
    const q = this.search().toLowerCase();
    return this.artworks().filter(
      (a) =>
        !q ||
        a.fileName.toLowerCase().includes(q) ||
        a.order?.orderNo?.toLowerCase().includes(q) ||
        a.order?.customerName?.toLowerCase().includes(q),
    );
  });

  uploadOpen = false;
  selectedFile: File | null = null;
  uploadOrderId = '';

  openUpload(): void {
    const list = this.orders();
    this.uploadOrderId = list.length ? list[0].id : '';
    this.selectedFile = null;
    this.uploadOpen = true;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  submitUpload(): void {
    if (!this.selectedFile || !this.uploadOrderId) return;
    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('orderId', this.uploadOrderId);
    formData.append('bucket', 'artworks');

    this.api.upload<ArtworkUpload>('/upload', formData).subscribe({
      next: () => {
        this.data.artworks.refresh();
        this.uploadOpen = false;
      },
      error: (err) => console.error('Upload failed', err),
    });
  }

  orderLabel(order: Order): string {
    return `${order.orderNo} — ${order.customerName}`;
  }
}
