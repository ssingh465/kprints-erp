import { Component, Input } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
})
export class EmptyState {
  @Input({ required: true }) icon = 'pi pi-inbox';
  @Input({ required: true }) title = 'No data yet';
  @Input() description = '';
  @Input() actionLabel = '';
  @Input() actionIcon = 'pi pi-plus';
}
