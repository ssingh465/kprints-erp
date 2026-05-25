import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { TooltipModule } from 'primeng/tooltip';
import { MockSeedService } from '../../core/services/mock-seed.service';
import { ThemeService } from '../../core/services/theme.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ButtonModule,
    DrawerModule,
    TooltipModule,
  ],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  private readonly router = inject(Router);
  private readonly seed = inject(MockSeedService);
  readonly theme = inject(ThemeService);

  readonly sidebarCollapsed = signal(false);
  readonly mobileMenuOpen = signal(false);
  readonly notificationsOpen = signal(false);
  readonly currentUrl = signal(this.router.url);
  readonly navGroups: NavGroup[] = [
    {
      label: 'Workspace',
      items: [
        { label: 'Dashboard', icon: 'pi pi-chart-bar', route: '/dashboard' },
        { label: 'Orders', icon: 'pi pi-shopping-bag', route: '/orders' },
        { label: 'Customers', icon: 'pi pi-users', route: '/customers' },
        { label: 'Poster Catalog', icon: 'pi pi-images', route: '/catalog' },
      ],
    },
    {
      label: 'Operations',
      items: [
        { label: 'Production', icon: 'pi pi-sitemap', route: '/production' },
        { label: 'Print Queue', icon: 'pi pi-print', route: '/print-queue' },
        { label: 'Material Inventory', icon: 'pi pi-box', route: '/inventory' },
        { label: 'Shipments', icon: 'pi pi-truck', route: '/shipments' },
        { label: 'Artwork Uploads', icon: 'pi pi-upload', route: '/artwork-uploads' },
      ],
    },
    {
      label: 'Commercial',
      items: [
        { label: 'Finance', icon: 'pi pi-indian-rupee', route: '/finance' },
        { label: 'Purchases', icon: 'pi pi-receipt', route: '/purchases' },
        { label: 'Vendors', icon: 'pi pi-briefcase', route: '/vendors' },
        { label: 'Coupons', icon: 'pi pi-ticket', route: '/coupons' },
        { label: 'Reports', icon: 'pi pi-chart-line', route: '/reports' },
      ],
    },
    {
      label: 'Admin',
      items: [{ label: 'Settings', icon: 'pi pi-cog', route: '/settings' }],
    },
  ];

  readonly breadcrumbs = computed(() => {
    const [, segment = 'dashboard'] = this.currentUrl().split('/');
    return segment
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  });

  readonly notifications = [
    '3 print jobs require operator assignment',
    'Cyan Ink 1L is below reorder level',
    'ORD-1049 is packed and ready for carrier pickup',
    'May profit margin is tracking 2.8% above April',
  ];

  constructor() {
    this.seed.ensureSeeded();
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.currentUrl.set(event.urlAfterRedirects));
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((value) => !value);
  }
}
