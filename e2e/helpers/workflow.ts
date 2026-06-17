/**
 * Cross-module workflow helpers for Playwright specs.
 */

import { ApiClient } from '../factories/api-client.js';

export interface ShipmentRecord {
  id: string;
  orderId: string;
  orderNo: string;
  trackingNo: string;
  status: string;
  carrier: string;
  city: string;
  eta: string;
}

export interface FinanceSummary {
  revenue: number;
  collected: number;
  expenses: number;
  profit: number;
  orderCount: number;
}

export interface DashboardMetrics {
  kpis: {
    revenue: number;
    collected: number;
    expenses: number;
    profit: number;
    orderCount: number;
    pendingPrintJobs: number;
    inventoryAlerts: number;
  };
}

export async function updateShipmentStatus(
  client: ApiClient,
  shipmentId: string,
  status: ShipmentRecord['status']
): Promise<ShipmentRecord> {
  const response = await client.put<{ success: boolean; data: ShipmentRecord }>(
    `/shipments/${shipmentId}/status`,
    { status }
  );
  return response.data;
}

export async function fetchFinanceSummary(client: ApiClient): Promise<FinanceSummary> {
  const response = await client.get<{ success: boolean; data: FinanceSummary }>('/finance/summary');
  return response.data;
}

export async function fetchDashboardMetrics(client: ApiClient): Promise<DashboardMetrics> {
  const response = await client.get<{ success: boolean; data: DashboardMetrics }>('/dashboard');
  return response.data;
}
