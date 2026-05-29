import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { TooltipModule } from 'primeng/tooltip';
import { ThemeService } from '../../core/services/theme.service';
import { SessionService } from '../../core/auth/session.service';
import { DemoModeService } from '../../core/auth/demo-mode.service';
import { OperationalSignalsService } from '../../core/services/operational-signals.service';
import { ROLE_LABELS } from '../../core/auth/auth.models';
import { NAV_GROUPS } from '../../core/navigation/nav.config';

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
export class AppShell implements OnInit {
  readonly theme = inject(ThemeService);
  private readonly session = inject(SessionService);
  private readonly demo = inject(DemoModeService);
  private readonly router = inject(Router);
  private readonly signals = inject(OperationalSignalsService);

  readonly isDemo = this.demo.isDemo;
  readonly isAuthenticated = this.session.isAuthenticated;
  readonly signingOut = signal(false);

  readonly profile = computed(() => {
    if (this.isDemo()) {
      return { initials: 'DX', name: 'Demo User', subtitle: 'Sandbox' };
    }
    const user = this.session.appUser();
    if (!user) {
      return { initials: '··', name: 'Account', subtitle: '' };
    }
    return {
      initials: user.initials,
      name: user.fullName,
      subtitle: ROLE_LABELS[user.role],
    };
  });

  readonly sidebarCollapsed = signal(false);
  readonly mobileMenuOpen = signal(false);
  readonly notificationsOpen = signal(false);

  readonly navGroups = computed<NavGroup[]>(() =>
    NAV_GROUPS.map((group) => ({
      label: group.label,
      items: group.items
        .filter((item) => this.session.canAccess(item.module))
        .map(({ label, icon, route }) => ({ label, icon, route })),
    })).filter((group) => group.items.length > 0)
  );

  readonly notifications = this.signals.notifications;
  readonly notificationBadge = computed(() => {
    const count = this.notifications().length;
    return count > 0 ? String(count) : undefined;
  });
  readonly todayLabel = computed(() => {
    const formatted = new Intl.DateTimeFormat('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
    return `Today, ${formatted}`;
  });

  ngOnInit(): void {
    this.signals.refresh();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((value) => !value);
  }

  async exit(): Promise<void> {
    this.signingOut.set(true);
    if (this.isDemo()) {
      this.demo.exitDemo();
    } else {
      await this.session.signOut();
    }
    await this.router.navigate(['/welcome']);
  }
}
