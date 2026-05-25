import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/app-shell/app-shell').then((m) => m.AppShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard | KPrints ERP',
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard-page/dashboard-page').then(
            (m) => m.DashboardPage,
          ),
      },
      {
        path: 'orders',
        title: 'Orders | KPrints ERP',
        loadComponent: () =>
          import('./features/orders/pages/orders-page/orders-page').then(
            (m) => m.OrdersPage,
          ),
      },
      {
        path: 'customers',
        title: 'Customers | KPrints ERP',
        loadComponent: () =>
          import('./features/customers/pages/customers-page/customers-page').then(
            (m) => m.CustomersPage,
          ),
      },
      {
        path: 'catalog',
        title: 'Poster Catalog | KPrints ERP',
        loadComponent: () =>
          import('./features/catalog/pages/catalog-page/catalog-page').then(
            (m) => m.CatalogPage,
          ),
      },
      {
        path: 'inventory',
        title: 'Inventory | KPrints ERP',
        loadComponent: () =>
          import('./features/inventory/pages/inventory-page/inventory-page').then(
            (m) => m.InventoryPage,
          ),
      },
      {
        path: 'production',
        title: 'Production Workflow | KPrints ERP',
        loadComponent: () =>
          import('./features/production/pages/production-page/production-page').then(
            (m) => m.ProductionPage,
          ),
      },
      {
        path: 'finance',
        title: 'Finance | KPrints ERP',
        loadComponent: () =>
          import('./features/finance/pages/finance-page/finance-page').then(
            (m) => m.FinancePage,
          ),
      },
      {
        path: 'reports',
        title: 'Reports | KPrints ERP',
        loadComponent: () =>
          import('./features/reports/pages/reports-page/reports-page').then(
            (m) => m.ReportsPage,
          ),
      },
      {
        path: 'settings',
        title: 'Settings | KPrints ERP',
        loadComponent: () =>
          import('./features/settings/pages/settings-page/settings-page').then(
            (m) => m.SettingsPage,
          ),
      },
      {
        path: ':module',
        title: 'Operations | KPrints ERP',
        loadComponent: () =>
          import('./features/operations/pages/operation-page/operation-page').then(
            (m) => m.OperationPage,
          ),
      },
    ],
  },
];
