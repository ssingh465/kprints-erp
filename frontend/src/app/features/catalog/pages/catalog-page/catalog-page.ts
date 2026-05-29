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
import { Poster, PosterListResponse } from '../../../../models/erp.models';
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

  readonly search = signal('');
  readonly posters = signal<Poster[]>([]);
  readonly loading = signal(false);
  readonly salesColumnLabel = computed(() => this.period.salesColumnLabel());
  readonly periodLabel = computed(() => this.period.label());

  readonly filtered = computed(() => {
    const query = this.search().toLowerCase();
    return this.posters().filter(
      (poster) =>
        poster.title.toLowerCase().includes(query) ||
        poster.sku.toLowerCase().includes(query) ||
        poster.category.toLowerCase().includes(query),
    );
  });

  readonly posterCategories = [
    'Minimalist',
    'Anime & Manga',
    'Vintage & Retro',
    'Typography',
    'Nature & Travel',
  ];

  addPosterOpen = false;
  newPoster = this.emptyPoster();

  ngOnInit(): void {
    this.loadPosters();
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
    this.addPosterOpen = true;
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
