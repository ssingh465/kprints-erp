import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-card',
  standalone: true,
  template: `
    <section
      class="app-card-host"
      [class.app-card-hover]="hover"
      [class.glass-card]="glass"
      [class.no-padding]="!padding"
    >
      @if (title || subtitle) {
        <header class="panel-heading">
          <div>
            @if (title) {
              <h2>{{ title }}</h2>
            }
            @if (subtitle) {
              <p>{{ subtitle }}</p>
            }
          </div>
          <ng-content select="[headerActions]" />
        </header>
      }
      <ng-content />
    </section>
  `,
  styleUrl: './app-card.scss',
})
export class AppCard {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() hover = false;
  @Input() padding = true;
  @Input() glass = false;
}
