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

export type PeriodPreset = 'this_month' | 'last3m' | 'last6m' | 'last12m' | 'all' | 'custom';

export interface PeriodMeta {
  preset: PeriodPreset;
  from: string | null;
  to: string;
  label: string;
}

export interface FinanceSummary {
  revenue: number;
  collected: number;
  expenses: number;
  profit: number;
  orderCount: number;
  period: PeriodMeta;
}

export interface MonthlyMetricsResponse {
  metrics: MonthlyMetric[];
  period: PeriodMeta;
}

export type FinancialStatementRowFormat = 'amount' | 'percent';

export interface FinancialStatementRow {
  key: string;
  label: string;
  format: FinancialStatementRowFormat;
  values: (number | null)[];
  emphasis?: boolean;
}

export interface FinancialStatement {
  statement: 'quarterly' | 'pnl' | 'balance_sheet' | 'cash_flow';
  source: 'computed';
  unit: 'INR';
  subtitle: string;
  periods: string[];
  rows: FinancialStatementRow[];
  period: PeriodMeta;
  notes?: string[];
}

export interface ExpenseListResponse {
  items: Expense[];
  period: PeriodMeta;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface OrderListResponse {
  items: Order[];
  period: PeriodMeta;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PosterListResponse {
  items: Poster[];
  period: PeriodMeta;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Coupon extends BaseEntity {
  code: string;
  discount: number;
  active: boolean;
}

export interface ArtworkUpload extends BaseEntity {
  orderId: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  order?: {
    orderNo: string;
    customerName: string;
    status: string;
  };
}

export interface PartnerInvestment extends BaseEntity {
  partnerId: string;
  amount: number;
  date: string;
  notes: string | null;
}

export interface Partner extends BaseEntity {
  name: string;
  profitSharePercent: number;
  totalInvested: number;
  investmentCount: number;
  investments: PartnerInvestment[];
}

export interface PartnerListResponse {
  items: Partner[];
  period: PeriodMeta;
}

export interface PartnerDistributionLine {
  partnerId: string;
  partnerName: string;
  profitSharePercent: number;
  totalInvested: number;
  distributionAmount: number;
}

export interface ProfitDistribution {
  revenue: number;
  expenseTotal: number;
  netProfit: number;
  distributableProfit: number;
  sharesValid: boolean;
  totalSharePercent: number;
  period: PeriodMeta;
  partners: PartnerDistributionLine[];
}
