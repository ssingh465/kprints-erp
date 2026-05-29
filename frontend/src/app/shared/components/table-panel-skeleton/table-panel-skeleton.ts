import { Component, Input } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-table-panel-skeleton',
  standalone: true,
  imports: [SkeletonModule],
  templateUrl: './table-panel-skeleton.html',
  styleUrl: './table-panel-skeleton.scss',
})
export class TablePanelSkeleton {
  @Input() rows = 8;
  @Input() showToolbar = true;

  rowIndices(): number[] {
    return Array.from({ length: this.rows }, (_, index) => index);
  }
}
