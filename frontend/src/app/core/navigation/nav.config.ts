export interface NavItem {
  label: string;
  icon: string;
  route: string;
  module: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Sidebar navigation config. Each item maps to a ROLE_ACCESS module key.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { label: 'Dashboard', icon: 'pi pi-chart-bar', route: '/dashboard', module: 'dashboard' },
      { label: 'Orders', icon: 'pi pi-shopping-bag', route: '/orders', module: 'orders' },
      { label: 'Customers', icon: 'pi pi-users', route: '/customers', module: 'customers' },
      { label: 'Poster Catalog', icon: 'pi pi-images', route: '/catalog', module: 'catalog' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Production', icon: 'pi pi-sitemap', route: '/production', module: 'production' },
      { label: 'Print Queue', icon: 'pi pi-print', route: '/print-queue', module: 'print-queue' },
      { label: 'Material Inventory', icon: 'pi pi-box', route: '/inventory', module: 'inventory' },
      { label: 'Shipments', icon: 'pi pi-truck', route: '/shipments', module: 'shipments' },
      { label: 'Artwork Uploads', icon: 'pi pi-upload', route: '/artwork-uploads', module: 'artwork-uploads' },
    ],
  },
  {
    label: 'Commercial',
    items: [
      { label: 'Finance', icon: 'pi pi-indian-rupee', route: '/finance', module: 'finance' },
      { label: 'Purchase Ledger', icon: 'pi pi-receipt', route: '/purchases', module: 'purchases' },
      { label: 'Vendors', icon: 'pi pi-briefcase', route: '/vendors', module: 'vendors' },
      { label: 'Coupons', icon: 'pi pi-ticket', route: '/coupons', module: 'coupons' },
      { label: 'Reports', icon: 'pi pi-chart-line', route: '/reports', module: 'reports' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { label: 'Settings', icon: 'pi pi-cog', route: '/settings', module: 'settings' },
      { label: 'Users', icon: 'pi pi-user-edit', route: '/admin/users', module: 'admin/users' },
    ],
  },
];
