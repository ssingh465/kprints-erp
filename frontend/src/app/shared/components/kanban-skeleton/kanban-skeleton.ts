import { Component, Input } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-kanban-skeleton',
  standalone: true,
  imports: [SkeletonModule],
  templateUrl: './kanban-skeleton.html',
  styleUrl: './kanban-skeleton.scss',
})
export class KanbanSkeleton {
  @Input() columns = 8;
  @Input() cardsPerColumn = 2;

  columnIndices(): number[] {
    return Array.from({ length: this.columns }, (_, index) => index);
  }

  cardIndices(): number[] {
    return Array.from({ length: this.cardsPerColumn }, (_, index) => index);
  }
}
