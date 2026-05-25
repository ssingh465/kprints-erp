export type Channel = 'Offline' | 'Website' | 'Marketplace';
export type OrderType = 'Ready-made' | 'Custom Design' | 'Personalized';

export type OrderStatus =
  | 'Draft'
  | 'Design Pending'
  | 'Design Approved'
  | 'Printing Queued'
  | 'Printing In Progress'
  | 'Lamination'
  | 'Framing'
  | 'Packaging'
  | 'Ready for Pickup'
  | 'Ready for Shipping'
  | 'Delivered'
  | 'Cancelled';

export type InventoryCategory =
  | 'Poster Stock'
  | 'Paper Rolls'
  | 'Ink'
  | 'Frames'
  | 'Lamination Sheets'
  | 'Packaging Material'
  | 'Accessories';

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer extends BaseEntity {
  name: string;
  phone: string;
  email: string;
  city: string;
  source: Channel;
  lifetimeValue: number;
  orderCount: number;
}

export interface Poster extends BaseEntity {
  sku: string;
  title: string;
  category: string;
  tags: string[];
  size: string;
  price: number;
  stock: number;
  soldThisMonth: number;
  active: boolean;
}

export interface OrderLine {
  posterId?: string;
  description: string;
  size: string;
  quantity: number;
  unitPrice: number;
  framing: string;
}

export interface Order extends BaseEntity {
  orderNo: string;
  customerId: string;
  customerName: string;
  type: OrderType;
  channel: Channel;
  status: OrderStatus;
  priority: 'Normal' | 'High' | 'Rush';
  dueDate: string;
  total: number;
  paid: number;
  lines: OrderLine[];
}

export interface InventoryItem extends BaseEntity {
  sku: string;
  name: string;
  category: InventoryCategory;
  supplierId: string;
  unit: string;
  quantity: number;
  reorderLevel: number;
  unitCost: number;
  lastMovement: string;
}

export interface Supplier extends BaseEntity {
  name: string;
  contact: string;
  phone: string;
  category: string;
  outstanding: number;
}

export interface Expense extends BaseEntity {
  date: string;
  category: string;
  vendor: string;
  amount: number;
  paymentMode: 'Cash' | 'UPI' | 'Card' | 'Bank Transfer';
  notes: string;
}

export interface PrintJob extends BaseEntity {
  jobNo: string;
  orderId: string;
  orderNo: string;
  customerName: string;
  stage: OrderStatus;
  priority: 'Normal' | 'High' | 'Rush';
  size: string;
  material: string;
  estimatedCompletion: string;
  operator: string;
}

export interface Shipment extends BaseEntity {
  orderNo: string;
  customerName: string;
  carrier: string;
  trackingNo: string;
  status: 'Packed' | 'In Transit' | 'Out for Delivery' | 'Delivered' | 'Delayed';
  city: string;
  eta: string;
}

export interface DashboardMetrics {
  revenue: number;
  orderCount: number;
  pendingPrintJobs: number;
  inventoryAlerts: number;
  expenses: number;
  profit: number;
}

export interface MonthlyMetric {
  month: string;
  revenue: number;
  expenses: number;
  orders: number;
}
