import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { MockSeedService } from '../../../../core/services/mock-seed.service';
import { StatusChip } from '../../../../shared/components/status-chip/status-chip';
import { InrPipe } from '../../../../shared/pipes/inr.pipe';

@Component({
  selector: 'app-catalog-page',
  standalone: true,
  imports: [CommonModule, ButtonModule, InputTextModule, TableModule, StatusChip, InrPipe],
  templateUrl: './catalog-page.html',
  styleUrl: './catalog-page.scss',
})
export class CatalogPage {
  readonly search = signal('');
  readonly posters = computed(() => this.seed.posters.entities());
  readonly filtered = computed(() => {
    const query = this.search().toLowerCase();
    return this.posters().filter(
      (poster) =>
        poster.title.toLowerCase().includes(query) ||
        poster.sku.toLowerCase().includes(query) ||
        poster.category.toLowerCase().includes(query),
    );
  });

  constructor(private readonly seed: MockSeedService) {}
}
