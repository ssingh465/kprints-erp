import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ApiClientService } from '../../../../core/services/api-client.service';
import { ErpDataService } from '../../../../core/services/erp-data.service';
import { PeriodService } from '../../../../core/services/period.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Poster, PosterCategory, PosterListResponse } from '../../../../models/erp.models';
import { PeriodSelector } from '../../../../shared/components/period-selector/period-selector';
import { StatusChip } from '../../../../shared/components/status-chip/status-chip';
import { TablePanelSkeleton } from '../../../../shared/components/table-panel-skeleton/table-panel-skeleton';
import { InrPipe } from '../../../../shared/pipes/inr.pipe';

@Component({
  selector: 'app-catalog-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    TableModule,
    StatusChip,
    InrPipe,
    PeriodSelector,
    TablePanelSkeleton,
  ],
  templateUrl: './catalog-page.html',
  styleUrl: './catalog-page.scss',
})
export class CatalogPage implements OnInit {
  private readonly data = inject(ErpDataService);
  private readonly api = inject(ApiClientService);
  private readonly period = inject(PeriodService);
  private readonly toast = inject(ToastService);

  readonly search = signal('');
  readonly posters = signal<Poster[]>([]);
  readonly categories = signal<PosterCategory[]>([]);
  readonly loading = signal(false);
  readonly salesColumnLabel = computed(() => this.period.salesColumnLabel());
  readonly periodLabel = computed(() => this.period.label());

  readonly categoryNames = computed(() => this.categories().map((c) => c.name));

  readonly filtered = computed(() => {
    const query = this.search().toLowerCase();
    return this.posters().filter(
      (poster) =>
        poster.title.toLowerCase().includes(query) ||
        poster.sku.toLowerCase().includes(query) ||
        poster.category.toLowerCase().includes(query),
    );
  });

  addPosterOpen = false;
  categoriesDialogOpen = false;
  newCategoryName = '';
  newPoster = this.emptyPoster();

  ngOnInit(): void {
    this.loadPosters();
    this.loadCategories();
  }

  onPeriodChange(): void {
    this.loadPosters();
  }

  private loadPosters(): void {
    this.loading.set(true);
    this.api.get<PosterListResponse>(`/posters?limit=500&${this.period.queryString()}`).subscribe({
      next: (result) => {
        this.posters.set(result.items);
        this.period.setActiveMeta(result.period);
        this.loading.set(false);
      },
      error: () => {
        this.posters.set([]);
        this.loading.set(false);
      },
    });
  }

  private loadCategories(): void {
    this.api.get<PosterCategory[]>('/poster-categories').subscribe({
      next: (items) => this.categories.set(items),
      error: () => this.categories.set([]),
    });
  }

  private emptyPoster(): Partial<Poster> {
    return {
      sku: '',
      title: '',
      category: 'Minimalist',
      tags: [],
      size: 'A3',
      price: 299,
      stock: 50,
      active: true,
    };
  }

  openAddPoster(): void {
    const randNo = Math.floor(1000 + Math.random() * 9000);
    this.newPoster = this.emptyPoster();
    this.newPoster.sku = `PST-${randNo}`;
    const names = this.categoryNames();
    if (names.length > 0) {
      this.newPoster.category = names[0];
    }
    this.addPosterOpen = true;
  }

  openCategoriesDialog(): void {
    this.newCategoryName = '';
    this.categoriesDialogOpen = true;
  }

  saveCategory(): void {
    const name = this.newCategoryName.trim();
    if (name.length < 2) return;

    this.api.post<PosterCategory>('/poster-categories', { name }).subscribe({
      next: () => {
        this.toast.success('Category added', name);
        this.newCategoryName = '';
        this.loadCategories();
      },
      error: (err) => this.toast.error('Category failed', err.message || 'Could not save category.'),
    });
  }

  deleteCategory(category: PosterCategory): void {
    if (!confirm(`Delete category "${category.name}"?`)) return;

    this.api.delete(`/poster-categories/${category.id}`).subscribe({
      next: () => {
        this.toast.success('Category deleted', category.name);
        this.loadCategories();
      },
      error: (err) => this.toast.error('Delete failed', err.message || 'Could not delete category.'),
    });
  }

  savePoster(): void {
    const posterToSave = {
      ...this.newPoster,
      id: crypto.randomUUID(),
      tags: this.newPoster.tags || [],
      soldThisMonth: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Poster;

    this.data.posters.save(posterToSave).subscribe({
      next: () => {
        this.addPosterOpen = false;
        this.loadPosters();
      },
      error: (err) => {
        console.error('Failed to save poster', err);
      },
    });
  }
}
