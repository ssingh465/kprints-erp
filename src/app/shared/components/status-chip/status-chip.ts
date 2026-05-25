import { Component, Input } from '@angular/core';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-status-chip',
  standalone: true,
  imports: [TagModule],
  template: `<p-tag [value]="value" [severity]="severity()" [rounded]="true" />`,
})
export class StatusChip {
  @Input({ required: true }) value = '';

  severity(): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const status = this.value.toLowerCase();

    if (status.includes('delivered') || status.includes('approved')) {
      return 'success';
    }

    if (status.includes('cancelled') || status.includes('delayed')) {
      return 'danger';
    }

    if (status.includes('pending') || status.includes('low') || status.includes('rush')) {
      return 'warn';
    }

    if (status.includes('printing') || status.includes('shipping') || status.includes('transit')) {
      return 'info';
    }

    return 'secondary';
  }
}
