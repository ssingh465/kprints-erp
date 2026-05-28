import { Component, Input } from '@angular/core';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-status-chip',
  standalone: true,
  imports: [TagModule],
  template: `
    <p-tag [value]="value" [severity]="severity()" [rounded]="true" [icon]="icon()" styleClass="status-badge-tag" />
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    :host ::ng-deep .status-badge-tag {
      gap: 0.3rem;
      padding-inline: 0.55rem;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.01em;
    }
  `,
})
export class StatusChip {
  @Input({ required: true }) value = '';

  severity(): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const status = this.value.toLowerCase();

    if (
      status.includes('delivered') ||
      status.includes('approved') ||
      status.includes('paid') ||
      status.includes('completed') ||
      status.includes('active')
    ) {
      return 'success';
    }

    if (status.includes('cancelled') || status.includes('delayed') || status.includes('failed')) {
      return 'danger';
    }

    if (
      status.includes('pending') ||
      status.includes('low') ||
      status.includes('rush') ||
      status.includes('high') ||
      status.includes('warn')
    ) {
      return 'warn';
    }

    if (
      status.includes('printing') ||
      status.includes('shipping') ||
      status.includes('transit') ||
      status.includes('progress') ||
      status.includes('queued')
    ) {
      return 'info';
    }

    return 'secondary';
  }

  icon(): string {
    const status = this.value.toLowerCase();

    if (status.includes('delivered') || status.includes('completed')) return 'pi pi-check-circle';
    if (status.includes('cancelled') || status.includes('failed')) return 'pi pi-times-circle';
    if (status.includes('pending') || status.includes('queued')) return 'pi pi-clock';
    if (status.includes('printing') || status.includes('progress')) return 'pi pi-cog';
    if (status.includes('shipping') || status.includes('transit')) return 'pi pi-truck';
    if (status.includes('rush') || status.includes('high')) return 'pi pi-bolt';
    if (status.includes('low')) return 'pi pi-exclamation-triangle';

    return 'pi pi-circle-fill';
  }
}
