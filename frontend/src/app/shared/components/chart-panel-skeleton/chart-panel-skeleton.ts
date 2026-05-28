import { Component, Input } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-chart-panel-skeleton',
  standalone: true,
  imports: [SkeletonModule],
  templateUrl: './chart-panel-skeleton.html',
  styleUrl: './chart-panel-skeleton.scss',
})
export class ChartPanelSkeleton {
  @Input() showHeading = true;
  @Input() chartHeight = '240px';
}
