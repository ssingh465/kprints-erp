import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ApiClientService } from '../../../../core/services/api-client.service';
import { ErpDataService } from '../../../../core/services/erp-data.service';
import { Shipment } from '../../../../models/erp.models';
import { StatusChip } from '../../../../shared/components/status-chip/status-chip';
import { TablePanelSkeleton } from '../../../../shared/components/table-panel-skeleton/table-panel-skeleton';

@Component({
  selector: 'app-shipments-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, SelectModule, TableModule, StatusChip, TablePanelSkeleton],
  templateUrl: './shipments-page.html',
  styleUrl: './shipments-page.scss',
})
export class ShipmentsPage {
  private readonly data = inject(ErpDataService);
  private readonly api = inject(ApiClientService);

  readonly search = signal('');
  readonly loading = computed(() => this.data.shipments.loading());
  readonly shipments = computed(() => this.data.shipments.entities());
  readonly filtered = computed(() => {
    const query = this.search().toLowerCase();
    return this.shipments().filter(
      (s) =>
        !query ||
        s.trackingNo.toLowerCase().includes(query) ||
        s.orderNo.toLowerCase().includes(query) ||
        s.customerName.toLowerCase().includes(query),
    );
  });

  readonly carriers = ['Delhivery', 'BlueDart', 'DHL', 'FedEx'];
  readonly shipmentStatuses = ['Packed', 'In Transit', 'Out for Delivery', 'Delivered', 'Delayed'];

  createOpen = false;
  statusDialogOpen = false;
  selected: Shipment | null = null;
  newStatus: Shipment['status'] = 'Packed';
  newShipment = this.emptyShipment();

  openCreate(): void {
    this.newShipment = this.emptyShipment();
    this.createOpen = true;
  }

  saveShipment(): void {
    const payload = {
      ...this.newShipment,
      eta: new Date(this.newShipment.eta).toISOString(),
    };
    this.api.post<Shipment>('/shipments', payload).subscribe({
      next: () => {
        this.data.shipments.refresh();
        this.createOpen = false;
      },
    });
  }

  openStatus(shipment: Shipment): void {
    this.selected = shipment;
    this.newStatus = shipment.status;
    this.statusDialogOpen = true;
  }

  saveStatus(): void {
    if (!this.selected) return;
    this.api.put<Shipment>(`/shipments/${this.selected.id}/status`, { status: this.newStatus }).subscribe({
      next: () => {
        this.data.shipments.refresh();
        this.statusDialogOpen = false;
      },
    });
  }

  private emptyShipment() {
    return {
      orderNo: '',
      customerName: '',
      carrier: 'Delhivery',
      trackingNo: `TRK${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'Packed' as const,
      city: '',
      eta: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };
  }
}
