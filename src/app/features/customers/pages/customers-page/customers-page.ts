import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { MockSeedService } from '../../../../core/services/mock-seed.service';
import { StatusChip } from '../../../../shared/components/status-chip/status-chip';
import { InrPipe } from '../../../../shared/pipes/inr.pipe';

@Component({
  selector: 'app-customers-page',
  standalone: true,
  imports: [CommonModule, ButtonModule, InputTextModule, TableModule, StatusChip, InrPipe],
  templateUrl: './customers-page.html',
  styleUrl: './customers-page.scss',
})
export class CustomersPage {
  readonly search = signal('');
  readonly customers = computed(() => this.seed.customers.entities());
  readonly filtered = computed(() => {
    const query = this.search().toLowerCase();
    return this.customers().filter(
      (customer) =>
        customer.name.toLowerCase().includes(query) ||
        customer.city.toLowerCase().includes(query) ||
        customer.phone.includes(query),
    );
  });

  constructor(private readonly seed: MockSeedService) {}
}
