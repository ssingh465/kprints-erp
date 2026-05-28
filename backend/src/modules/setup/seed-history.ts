/**
 * Curated demo history for the last two quarters (6 calendar months).
 * Records use fixed IDs and explicit links to customers, posters, and suppliers.
 */

export interface MonthlyMetricTarget {
  month: string;
  revenue: number;
  expenses: number;
  orders: number;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CUSTOMER = {
  aarav: 'a06fa78e-64d5-4929-a720-302251a37c01',
  nisha: 'b21fa78e-64d5-4929-a720-302251a37c02',
  cafe: 'c32fa78e-64d5-4929-a720-302251a37c03',
  priya: 'd43fa78e-64d5-4929-a720-302251a37c04',
} as const;

const POSTER = {
  mountain: 'e04fa78e-64d5-4929-a720-302251a37c05',
  bollywood: 'f15fa78e-64d5-4929-a720-302251a37c06',
  personalized: 'a26fa78e-64d5-4929-a720-302251a37c07',
  travel: 'b37fa78e-64d5-4929-a720-302251a37c08',
} as const;

const SUPPLIER = {
  paper: 'c48fa78e-64d5-4929-a720-302251a37c09',
  frames: 'd59fa78e-64d5-4929-a720-302251a37c10',
  ink: 'e60fa78e-64d5-4929-a720-302251a37c11',
} as const;

/** Last six calendar months ending in the anchor month (UTC). */
export function buildLast6MonthStarts(anchor = new Date()): Date[] {
  const cursor = new Date(anchor);
  cursor.setUTCDate(1);
  const months: Date[] = [];

  for (let i = 5; i >= 0; i--) {
    months.push(new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() - i, 1)));
  }

  return months;
}

function monthLabel(date: Date): string {
  return MONTH_LABELS[date.getUTCMonth()];
}

function dayInMonth(monthStart: Date, day: number): Date {
  return new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), day, 12, 0, 0));
}

/** KPI targets for chart fallbacks — one row per month in the 6-month window. */
export function buildMonthlyMetrics(anchor = new Date()): MonthlyMetricTarget[] {
  const monthStarts = buildLast6MonthStarts(anchor);
  const revenueSeries = [2000, 4800, 3700, 19600, 21700, 21000];
  const expenseSeries = [24500, 4950, 11400, 3200, 4800, 9800];
  const orderSeries = [2, 2, 2, 2, 2, 4];

  return monthStarts.map((start, index) => ({
    month: monthLabel(start),
    revenue: revenueSeries[index],
    expenses: expenseSeries[index],
    orders: orderSeries[index],
  }));
}

export type HistoricalOrderSeed = {
  id: string;
  orderNo: string;
  customerId: string;
  customerName: string;
  type: string;
  channel: string;
  status: string;
  priority: string;
  dueDate: Date;
  createdAt: Date;
  total: number;
  paid: number;
  lines: Array<{
    id: string;
    description: string;
    size: string;
    quantity: number;
    unitPrice: number;
    framing: string;
    posterId?: string;
  }>;
};

export type HistoricalExpenseSeed = {
  id: string;
  date: Date;
  category: string;
  vendor: string;
  supplierId?: string;
  amount: number;
  paymentMode: string;
  notes: string;
};

type OrderSpec = {
  id: string;
  lineId: string;
  orderNo: string;
  monthIndex: number;
  day: number;
  customerId: string;
  customerName: string;
  type: string;
  channel: string;
  posterId?: string;
  description: string;
  size: string;
  quantity: number;
  unitPrice: number;
  framing: string;
};

/** Two delivered orders per month for the first five months (current month uses operational orders). */
const HISTORICAL_ORDER_SPECS: OrderSpec[] = [
  {
    id: 'a010a78e-64d5-4929-a720-302251a37c01',
    lineId: '10000001-64d5-4929-a720-302251a37c01',
    orderNo: 'ORD-1001',
    monthIndex: 0,
    day: 6,
    customerId: CUSTOMER.priya,
    customerName: 'Priya Sethi',
    type: 'Ready-made',
    channel: 'Marketplace',
    posterId: POSTER.travel,
    description: 'India Travel Grid',
    size: 'A2',
    quantity: 1,
    unitPrice: 1199,
    framing: 'No frame',
  },
  {
    id: 'a020a78e-64d5-4929-a720-302251a37c02',
    lineId: '10000002-64d5-4929-a720-302251a37c02',
    orderNo: 'ORD-1002',
    monthIndex: 0,
    day: 18,
    customerId: CUSTOMER.aarav,
    customerName: 'Aarav Mehta',
    type: 'Ready-made',
    channel: 'Offline',
    posterId: POSTER.mountain,
    description: 'Minimal Mountain Line Art',
    size: '18 x 24 in',
    quantity: 1,
    unitPrice: 799,
    framing: 'No frame',
  },
  {
    id: 'a030a78e-64d5-4929-a720-302251a37c03',
    lineId: '10000003-64d5-4929-a720-302251a37c03',
    orderNo: 'ORD-1003',
    monthIndex: 1,
    day: 9,
    customerId: CUSTOMER.nisha,
    customerName: 'Nisha Kapoor',
    type: 'Ready-made',
    channel: 'Website',
    posterId: POSTER.bollywood,
    description: 'Bollywood Retro Collage',
    size: '12 x 18 in',
    quantity: 1,
    unitPrice: 599,
    framing: 'No frame',
  },
  {
    id: 'a040a78e-64d5-4929-a720-302251a37c04',
    lineId: '10000004-64d5-4929-a720-302251a37c04',
    orderNo: 'ORD-1004',
    monthIndex: 1,
    day: 22,
    customerId: CUSTOMER.cafe,
    customerName: 'Canvas & Co Cafe',
    type: 'Personalized',
    channel: 'Offline',
    description: 'Cafe opening teaser posters',
    size: 'A2',
    quantity: 3,
    unitPrice: 1400,
    framing: 'Wood frame',
  },
  {
    id: 'a050a78e-64d5-4929-a720-302251a37c05',
    lineId: '10000005-64d5-4929-a720-302251a37c05',
    orderNo: 'ORD-1005',
    monthIndex: 2,
    day: 11,
    customerId: CUSTOMER.aarav,
    customerName: 'Aarav Mehta',
    type: 'Custom Design',
    channel: 'Offline',
    description: 'Anniversary portrait poster',
    size: '18 x 24 in',
    quantity: 1,
    unitPrice: 2499,
    framing: 'Black frame',
  },
  {
    id: 'a060a78e-64d5-4929-a720-302251a37c06',
    lineId: '10000006-64d5-4929-a720-302251a37c06',
    orderNo: 'ORD-1006',
    monthIndex: 2,
    day: 24,
    customerId: CUSTOMER.priya,
    customerName: 'Priya Sethi',
    type: 'Ready-made',
    channel: 'Marketplace',
    posterId: POSTER.travel,
    description: 'India Travel Grid',
    size: 'A2',
    quantity: 1,
    unitPrice: 1199,
    framing: 'No frame',
  },
  {
    id: 'a070a78e-64d5-4929-a720-302251a37c07',
    lineId: '10000007-64d5-4929-a720-302251a37c07',
    orderNo: 'ORD-1007',
    monthIndex: 3,
    day: 8,
    customerId: CUSTOMER.nisha,
    customerName: 'Nisha Kapoor',
    type: 'Ready-made',
    channel: 'Website',
    posterId: POSTER.mountain,
    description: 'Minimal Mountain Line Art',
    size: '18 x 24 in',
    quantity: 4,
    unitPrice: 2499,
    framing: 'Black frame',
  },
  {
    id: 'a080a78e-64d5-4929-a720-302251a37c08',
    lineId: '10000008-64d5-4929-a720-302251a37c08',
    orderNo: 'ORD-1008',
    monthIndex: 3,
    day: 20,
    customerId: CUSTOMER.cafe,
    customerName: 'Canvas & Co Cafe',
    type: 'Ready-made',
    channel: 'Offline',
    posterId: POSTER.bollywood,
    description: 'Bollywood Retro Collage',
    size: '12 x 18 in',
    quantity: 8,
    unitPrice: 1199,
    framing: 'No frame',
  },
  {
    id: 'a090a78e-64d5-4929-a720-302251a37c09',
    lineId: '10000009-64d5-4929-a720-302251a37c09',
    orderNo: 'ORD-1009',
    monthIndex: 4,
    day: 7,
    customerId: CUSTOMER.aarav,
    customerName: 'Aarav Mehta',
    type: 'Custom Design',
    channel: 'Offline',
    description: 'Wedding welcome board poster',
    size: '24 x 36 in',
    quantity: 1,
    unitPrice: 8500,
    framing: 'Black frame',
  },
  {
    id: 'a100a78e-64d5-4929-a720-302251a37c10',
    lineId: '10000010-64d5-4929-a720-302251a37c10',
    orderNo: 'ORD-1010',
    monthIndex: 4,
    day: 19,
    customerId: CUSTOMER.nisha,
    customerName: 'Nisha Kapoor',
    type: 'Personalized',
    channel: 'Website',
    posterId: POSTER.personalized,
    description: 'Personalized Name Poster',
    size: 'A3',
    quantity: 6,
    unitPrice: 2200,
    framing: 'Wood frame',
  },
];

type ExpenseSpec = {
  id: string;
  monthIndex: number;
  day: number;
  category: string;
  vendor: string;
  supplierId?: string;
  amount: number;
  paymentMode: string;
  notes: string;
};

const HISTORICAL_EXPENSE_SPECS: ExpenseSpec[] = [
  {
    id: 'e010a78e-64d5-4929-a720-302251a37c01',
    monthIndex: 0,
    day: 10,
    category: 'Materials',
    vendor: 'Shree Paper Mart',
    supplierId: SUPPLIER.paper,
    amount: 24500,
    paymentMode: 'Bank Transfer',
    notes: 'Matte paper roll replenishment',
  },
  {
    id: 'e020a78e-64d5-4929-a720-302251a37c02',
    monthIndex: 1,
    day: 12,
    category: 'Materials',
    vendor: 'Inkline Supplies',
    supplierId: SUPPLIER.ink,
    amount: 4950,
    paymentMode: 'Bank Transfer',
    notes: 'Cyan and magenta ink bottles',
  },
  {
    id: 'e030a78e-64d5-4929-a720-302251a37c03',
    monthIndex: 2,
    day: 14,
    category: 'Materials',
    vendor: 'FrameCraft India',
    supplierId: SUPPLIER.frames,
    amount: 11400,
    paymentMode: 'UPI',
    notes: 'A3 black frame batch',
  },
  {
    id: 'e040a78e-64d5-4929-a720-302251a37c04',
    monthIndex: 3,
    day: 9,
    category: 'Packaging',
    vendor: 'Shree Paper Mart',
    supplierId: SUPPLIER.paper,
    amount: 3200,
    paymentMode: 'UPI',
    notes: 'Shipping tubes restock',
  },
  {
    id: 'e050a78e-64d5-4929-a720-302251a37c05',
    monthIndex: 4,
    day: 16,
    category: 'Utilities',
    vendor: 'Power Distribution',
    amount: 4800,
    paymentMode: 'Bank Transfer',
    notes: 'Shop electricity bill',
  },
];

export function buildHistoricalOrders(monthStarts: Date[]): HistoricalOrderSeed[] {
  return HISTORICAL_ORDER_SPECS.map((spec) => {
    const monthStart = monthStarts[spec.monthIndex];
    const createdAt = dayInMonth(monthStart, spec.day);
    const dueDate = dayInMonth(monthStart, Math.min(spec.day + 4, 28));
    const total = spec.unitPrice * spec.quantity;

    return {
      id: spec.id,
      orderNo: spec.orderNo,
      customerId: spec.customerId,
      customerName: spec.customerName,
      type: spec.type,
      channel: spec.channel,
      status: 'Delivered',
      priority: 'Normal',
      dueDate,
      createdAt,
      total,
      paid: total,
      lines: [
        {
          id: spec.lineId,
          description: spec.description,
          size: spec.size,
          quantity: spec.quantity,
          unitPrice: spec.unitPrice,
          framing: spec.framing,
          ...(spec.posterId ? { posterId: spec.posterId } : {}),
        },
      ],
    };
  });
}

export function buildHistoricalExpenses(monthStarts: Date[]): HistoricalExpenseSeed[] {
  return HISTORICAL_EXPENSE_SPECS.map((spec) => ({
    id: spec.id,
    date: dayInMonth(monthStarts[spec.monthIndex], spec.day),
    category: spec.category,
    vendor: spec.vendor,
    supplierId: spec.supplierId,
    amount: spec.amount,
    paymentMode: spec.paymentMode,
    notes: spec.notes,
  }));
}
