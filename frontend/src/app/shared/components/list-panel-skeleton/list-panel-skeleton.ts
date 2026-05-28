import { Component, Input } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-list-panel-skeleton',
  standalone: true,
  imports: [SkeletonModule],
  templateUrl: './list-panel-skeleton.html',
  styleUrl: './list-panel-skeleton.scss',
})
export class ListPanelSkeleton {
  @Input() items = 4;
  @Input() showProgress = false;

  itemIndices(): number[] {
    return Array.from({ length: this.items }, (_, index) => index);
  }
}
