import { Component } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-settings-card-skeleton',
  standalone: true,
  imports: [SkeletonModule],
  templateUrl: './settings-card-skeleton.html',
  styleUrl: './settings-card-skeleton.scss',
})
export class SettingsCardSkeleton {}
