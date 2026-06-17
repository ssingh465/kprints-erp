import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { approvalGuard } from './core/guards/approval.guard';
import { roleGuard } from './core/guards/role.guard';
import { guestGuard } from './core/guards/guest.guard';

const shellGuards = [authGuard, approvalGuard, roleGuard];

export const routes: Routes = [
  {
    path: 'welcome',
    title: 'Welcome | KPrints ERP',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./layout/startup/startup-page').then((m) => m.StartupPage),
  },
  {
    path: 'auth',
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'login' },
      {
        path: 'login',
        title: 'Sign in | KPrints ERP',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./features/auth/pages/login/login-page').then((m) => m.LoginPage),
      },
      {
        path: 'forgot-password',
        title: 'Forgot password | KPrints ERP',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./features/auth/pages/forgot-password/forgot-password-page').then(
            (m) => m.ForgotPasswordPage,
          ),
      },
      {
        path: 'reset-password',
        title: 'Reset password | KPrints ERP',
        loadComponent: () =>
          import('./features/auth/pages/reset-password/reset-password-page').then(
            (m) => m.ResetPasswordPage,
          ),
      },
      {
        path: 'accept-invite',
        title: 'Complete invitation | KPrints ERP',
        loadComponent: () =>
          import('./features/auth/pages/accept-invite/accept-invite-page').then(
            (m) => m.AcceptInvitePage,
          ),
      },
      {
        path: 'invite',
        title: 'Accept invitation | KPrints ERP',
        loadComponent: () =>
          import('./features/auth/pages/invite/invite-page').then((m) => m.InvitePage),
      },
      {
        path: 'verify-email',
        title: 'Verify email | KPrints ERP',
        loadComponent: () =>
          import('./features/auth/pages/verify-email/verify-email-page').then(
            (m) => m.VerifyEmailPage,
          ),
      },
      {
        path: 'callback',
        title: 'Signing in | KPrints ERP',
        loadComponent: () =>
          import('./features/auth/pages/callback/callback-page').then((m) => m.CallbackPage),
      },
      {
        path: 'pending-approval',
        title: 'Pending approval | KPrints ERP',
        loadComponent: () =>
          import('./features/auth/pages/status/auth-status-page').then((m) => m.AuthStatusPage),
        data: {
          status: {
            icon: 'pi pi-clock',
            iconTone: 'warning',
            title: 'Account pending approval',
            message:
              'Your account is set up and waiting for administrator approval. You\u2019ll get full access once an admin approves your account.',
            showSignOut: true,
          },
        },
      },
      {
        path: 'invite-required',
        title: 'Invitation required | KPrints ERP',
        loadComponent: () =>
          import('./features/auth/pages/status/auth-status-page').then((m) => m.AuthStatusPage),
        data: {
          status: {
            icon: 'pi pi-envelope',
            iconTone: 'warning',
            title: 'Invitation required',
            message:
              'Access to KPrints ERP is by invitation only. This email address has not been invited to the workspace. Contact your administrator to request access—they will send an invite link to complete your account setup.',
            showSignOut: true,
          },
        },
      },
      {
        path: 'profile-unavailable',
        title: 'Profile unavailable | KPrints ERP',
        loadComponent: () =>
          import('./features/auth/pages/status/auth-status-page').then((m) => m.AuthStatusPage),
        data: {
          status: {
            icon: 'pi pi-exclamation-triangle',
            iconTone: 'danger',
            title: 'Could not load your account',
            message:
              'You are signed in, but your ERP profile could not be loaded. Try signing out and back in. If you are a new administrator, ensure your account was provisioned. Contact your administrator if this continues.',
            showSignOut: true,
          },
        },
      },
      {
        path: 'account-disabled',
        title: 'Account disabled | KPrints ERP',
        loadComponent: () =>
          import('./features/auth/pages/status/auth-status-page').then((m) => m.AuthStatusPage),
        data: {
          status: {
            icon: 'pi pi-ban',
            iconTone: 'danger',
            title: 'Account disabled',
            message:
              'This account has been deactivated. Please contact your administrator if you believe this is a mistake.',
            showSignOut: true,
          },
        },
      },
      {
        path: 'unauthorized',
        title: 'Access denied | KPrints ERP',
        loadComponent: () =>
          import('./features/auth/pages/status/auth-status-page').then((m) => m.AuthStatusPage),
        data: {
          status: {
            icon: 'pi pi-lock',
            iconTone: 'danger',
            title: 'Access denied',
            message:
              'Your role does not include permission for this module. Contact your administrator if you need access.',
            showSignOut: false,
          },
        },
      },
      {
        path: 'session-expired',
        title: 'Session expired | KPrints ERP',
        loadComponent: () =>
          import('./features/auth/pages/status/auth-status-page').then((m) => m.AuthStatusPage),
        data: {
          status: {
            icon: 'pi pi-sign-out',
            iconTone: 'warning',
            title: 'Session expired',
            message: 'Your session has expired. Please sign in again to continue.',
            messageLink: { text: 'sign in', route: '/auth/login' },
            showSignOut: false,
          },
        },
      },
    ],
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/app-shell/app-shell').then((m) => m.AppShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard | KPrints ERP',
        canActivate: shellGuards,
        data: { module: 'dashboard' },
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard-page/dashboard-page').then(
            (m) => m.DashboardPage,
          ),
      },
      {
        path: 'orders',
        title: 'Orders | KPrints ERP',
        canActivate: shellGuards,
        data: { module: 'orders' },
        loadComponent: () =>
          import('./features/orders/pages/orders-page/orders-page').then(
            (m) => m.OrdersPage,
          ),
      },
      {
        path: 'customers',
        title: 'Customers | KPrints ERP',
        canActivate: shellGuards,
        data: { module: 'customers' },
        loadComponent: () =>
          import('./features/customers/pages/customers-page/customers-page').then(
            (m) => m.CustomersPage,
          ),
      },
      {
        path: 'catalog',
        title: 'Poster Catalog | KPrints ERP',
        canActivate: shellGuards,
        data: { module: 'catalog' },
        loadComponent: () =>
          import('./features/catalog/pages/catalog-page/catalog-page').then(
            (m) => m.CatalogPage,
          ),
      },
      {
        path: 'inventory',
        title: 'Inventory | KPrints ERP',
        canActivate: shellGuards,
        data: { module: 'inventory' },
        loadComponent: () =>
          import('./features/inventory/pages/inventory-page/inventory-page').then(
            (m) => m.InventoryPage,
          ),
      },
      {
        path: 'production',
        title: 'Production Workflow | KPrints ERP',
        canActivate: shellGuards,
        data: { module: 'production' },
        loadComponent: () =>
          import('./features/production/pages/production-page/production-page').then(
            (m) => m.ProductionPage,
          ),
      },
      {
        path: 'print-queue',
        title: 'Print Queue | KPrints ERP',
        canActivate: shellGuards,
        data: { module: 'print-queue' },
        loadComponent: () =>
          import('./features/print-queue/pages/print-queue-page/print-queue-page').then(
            (m) => m.PrintQueuePage,
          ),
      },
      {
        path: 'shipments',
        title: 'Shipments | KPrints ERP',
        canActivate: shellGuards,
        data: { module: 'shipments' },
        loadComponent: () =>
          import('./features/shipments/pages/shipments-page/shipments-page').then(
            (m) => m.ShipmentsPage,
          ),
      },
      {
        path: 'artwork-uploads',
        title: 'Artwork Uploads | KPrints ERP',
        canActivate: shellGuards,
        data: { module: 'artwork-uploads' },
        loadComponent: () =>
          import('./features/artwork-uploads/pages/artwork-uploads-page/artwork-uploads-page').then(
            (m) => m.ArtworkUploadsPage,
          ),
      },
      {
        path: 'finance',
        title: 'Finance | KPrints ERP',
        canActivate: shellGuards,
        data: { module: 'finance' },
        loadComponent: () =>
          import('./features/finance/pages/finance-page/finance-page').then(
            (m) => m.FinancePage,
          ),
      },
      {
        path: 'purchases',
        title: 'Purchases | KPrints ERP',
        canActivate: shellGuards,
        data: { module: 'purchases' },
        loadComponent: () =>
          import('./features/purchases/pages/purchases-page/purchases-page').then(
            (m) => m.PurchasesPage,
          ),
      },
      {
        path: 'vendors',
        title: 'Vendors | KPrints ERP',
        canActivate: shellGuards,
        data: { module: 'vendors' },
        loadComponent: () =>
          import('./features/vendors/pages/vendors-page/vendors-page').then(
            (m) => m.VendorsPage,
          ),
      },
      {
        path: 'coupons',
        title: 'Coupons | KPrints ERP',
        canActivate: shellGuards,
        data: { module: 'coupons' },
        loadComponent: () =>
          import('./features/coupons/pages/coupons-page/coupons-page').then(
            (m) => m.CouponsPage,
          ),
      },
      {
        path: 'reports',
        title: 'Reports | KPrints ERP',
        canActivate: shellGuards,
        data: { module: 'reports' },
        loadComponent: () =>
          import('./features/reports/pages/reports-page/reports-page').then(
            (m) => m.ReportsPage,
          ),
      },
      {
        path: 'reports/financial-statements',
        title: 'Financial Statements | KPrints ERP',
        canActivate: shellGuards,
        data: { module: 'reports' },
        loadComponent: () =>
          import('./features/reports/pages/financial-statements-page/financial-statements-page').then(
            (m) => m.FinancialStatementsPage,
          ),
      },
      {
        path: 'settings',
        title: 'Settings | KPrints ERP',
        canActivate: shellGuards,
        data: { module: 'settings' },
        loadComponent: () =>
          import('./features/settings/pages/settings-page/settings-page').then(
            (m) => m.SettingsPage,
          ),
      },
      {
        path: 'admin/users',
        title: 'Users | KPrints ERP',
        canActivate: shellGuards,
        data: { module: 'admin/users' },
        loadComponent: () =>
          import('./features/admin/users/pages/users-page/users-page').then(
            (m) => m.UsersPage,
          ),
      },
      {
        path: '**',
        redirectTo: 'dashboard',
      },
    ],
  },
];
