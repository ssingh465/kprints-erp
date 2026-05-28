import { Component, Input } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-loading-block',
  standalone: true,
  imports: [SkeletonModule],
  template: `
    <div class="loading-block skeleton-shimmer" [style.min-height]="height">
      @for (row of rowsArray; track row) {
        <p-skeleton [width]="rowWidth" height="1rem" borderRadius="8px" />
      }
    </div>
  `,
  styles: `
    .loading-block {
      display: grid;
      gap: 0.75rem;
      padding: 1rem 0;
    }
  `,
})
export class LoadingBlock {
  @Input() rows = 3;
  @Input() rowWidth = '100%';
  @Input() height = '120px';

  get rowsArray(): number[] {
    return Array.from({ length: this.rows }, (_, i) => i);
  }
}
