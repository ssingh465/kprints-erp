/**
 * Production-stage helper.
 *
 * Per workflow-map.md §4b, `PUT /api/production/:id/stage`:
 *   - Updates production_jobs.stage
 *   - Mirrors orders.status = stage
 *   - Creates a Shipment if stage ∈ {Ready for Shipping, Ready for Pickup}
 *   - DOES NOT write an audit log (gap G7)
 *   - DOES NOT update Shipment.status when stage = Delivered (gap G8)
 */

import { ApiClient } from './api-client.js';
import type { OrderStatus } from './order-factory.js';

export interface ProductionJobRecord {
  id: string;
  jobNo: string;
  orderId: string;
  orderNo: string;
  customerName: string;
  stage: OrderStatus;
  priority: string;
  size: string;
  material: string;
  estimatedCompletion: string | null;
  operator: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function advanceProductionStage(
  client: ApiClient,
  jobId: string,
  stage: OrderStatus
): Promise<ProductionJobRecord> {
  const response = await client.put<{ success: boolean; data: ProductionJobRecord }>(
    `/production/${jobId}/stage`,
    { stage }
  );
  return response.data ?? (response as unknown as ProductionJobRecord);
}

export async function assignProductionOperator(
  client: ApiClient,
  jobId: string,
  operator: string
): Promise<ProductionJobRecord> {
  const response = await client.put<{ success: boolean; data: ProductionJobRecord }>(
    `/production/${jobId}/operator`,
    { operator }
  );
  return response.data ?? (response as unknown as ProductionJobRecord);
}
