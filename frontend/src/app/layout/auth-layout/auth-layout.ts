import { Component, inject } from '@angular/core';
import { ThemeService } from '../../core/services/theme.service';

interface FeatureHighlight {
  icon: string;
  text: string;
}

/**
 * Reusable split-screen shell for every auth screen.
 * Left = branding/marketing; right = projected form via <ng-content>.
 */
@Component({
  selector: 'app-auth-layout',
  standalone: true,
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.scss',
})
export class AuthLayout {
  readonly theme = inject(ThemeService);

  readonly features: FeatureHighlight[] = [
    { icon: 'pi pi-sitemap', text: 'Order & production workflow tracking' },
    { icon: 'pi pi-box', text: 'Inventory and print queue management' },
    { icon: 'pi pi-chart-line', text: 'Finance reports and operational analytics' },
  ];
}
