/**
 * Order factory — the core cross-module fixture.
 *
 * Side effects observed by `POST /api/orders` (see workflow-map.md §3):
 *   - INSERT orders + order_items
 *   - UPDATE customers SET orderCount += 1, lifetimeValue += total
 *   - if status ∈ {Design Approved, Printing Queued, Printing In Progress,
 *     Lamination, Framing, Packaging} → INSERT production_jobs
 *   - INSERT audit_logs (action=create, entity=order)
 *
 * Side effects triggered by `POST /api/orders`:
 *   - INSERT orders + order_items
 *   - UPDATE customers SET orderCount += 1, lifetimeValue += total
 *   - if status ∈ production stages → INSERT production_jobs
 *   - if status ∈ stock-consumption stages → decrement Poster.stock
 *   - INSERT audit_logs (action=create, entity=order)
 *
 * Side effects NOT triggered (remaining gaps):
 *   - inventory_movements for raw-material consumption (G1 partial)
 *   - coupons ignored (G6)
 */

import { ApiClient } from './api-client.js';

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

export interface OrderLineInput {
  posterId?: string;
  description: string;
  size: string;
  quantity: number;
  unitPrice: number;
  framing?: string;
}

export interface OrderInput {
  customerId: string;
  type?: 'Ready-made' | 'Custom Design' | 'Personalized';
  channel?: 'Offline' | 'Website' | 'Marketplace';
  status?: OrderStatus;
  priority?: 'Normal' | 'High' | 'Rush';
  dueDate?: string | Date;
  total?: number;
  paid?: number;
  couponCode?: string;
  lines: OrderLineInput[];
}

export interface OrderRecord {
  id: string;
  orderNo: string;
  customerId: string;
  customerName: string;
  type: string;
  channel: string;
  status: OrderStatus;
  priority: string;
  dueDate: string;
  total: number;
  paid: number;
  lines: Array<OrderLineInput & { id: string; orderId: string }>;
  productionJob?: { id: string; jobNo: string; stage: OrderStatus } | null;
  shipment?: { id: string; trackingNo: string; status: string } | null;
  createdAt: string;
  updatedAt: string;
}

function defaultDueDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString();
}

function sumLines(lines: OrderLineInput[]): number {
  return lines.reduce((acc, line) => acc + line.quantity * line.unitPrice, 0);
}

export function orderInput(input: OrderInput): OrderInput & { total: number; dueDate: string } {
  const lines = input.lines.map((line) => ({
    framing: line.framing ?? 'No frame',
    ...line,
  }));
  const total = input.total ?? sumLines(lines);
  const dueDate =
    typeof input.dueDate === 'string'
      ? input.dueDate
      : input.dueDate
        ? input.dueDate.toISOString()
        : defaultDueDate();

  return {
    type: 'Ready-made',
    channel: 'Offline',
    status: 'Draft',
    priority: 'Normal',
    paid: 0,
    ...input,
    lines,
    total,
    dueDate,
  };
}

export async function createOrder(client: ApiClient, input: OrderInput): Promise<OrderRecord> {
  const payload = orderInput(input);
  const response = await client.post<{ success: boolean; data: OrderRecord }>(
    '/orders',
    payload
  );
  return response.data ?? (response as unknown as OrderRecord);
}

export async function updateOrderStatus(
  client: ApiClient,
  orderId: string,
  status: OrderStatus
): Promise<OrderRecord> {
  const response = await client.put<{ success: boolean; data: OrderRecord }>(
    `/orders/${orderId}`,
    { status }
  );
  return response.data ?? (response as unknown as OrderRecord);
}
