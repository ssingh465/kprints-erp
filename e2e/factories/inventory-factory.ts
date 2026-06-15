/**
 * Inventory item + movement factory.
 *
 * Per workflow-map.md §6, inventory movements are the ONLY way stock
 * quantity changes today — order workflows do NOT auto-record
 * consumption (gap G1). Tests should drive movements explicitly.
 */

import { ApiClient } from './api-client.js';

export interface InventoryItemInput {
  sku?: string;
  name?: string;
  category?: string;
  supplierId: string;
  unit?: string;
  quantity?: number;
  reorderLevel?: number;
  unitCost?: number;
}

export interface InventoryItemRecord extends Required<InventoryItemInput> {
  id: string;
  lastMovement: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryMovementInput {
  quantity: number;
  type: 'Purchase' | 'Consumption' | 'Adjustment';
  reference?: string;
  notes?: string;
}

export interface InventoryMovementRecord extends Required<InventoryMovementInput> {
  id: string;
  inventoryItemId: string;
  createdAt: string;
}

let counter = 0;

function uniqueSku(): string {
  counter += 1;
  return `TST-INV-${Date.now().toString(36).toUpperCase()}-${counter
    .toString()
    .padStart(3, '0')}`;
}

export function inventoryItemInput(
  overrides: Partial<InventoryItemInput> & Pick<InventoryItemInput, 'supplierId'>
): Required<InventoryItemInput> {
  return {
    sku: overrides.sku ?? uniqueSku(),
    name: overrides.name ?? `TEST Inventory Item ${counter}`,
    category: overrides.category ?? 'Paper Rolls',
    supplierId: overrides.supplierId,
    unit: overrides.unit ?? 'roll',
    quantity: overrides.quantity ?? 20,
    reorderLevel: overrides.reorderLevel ?? 5,
    unitCost: overrides.unitCost ?? 1000,
  };
}

export async function createInventoryItem(
  client: ApiClient,
  overrides: Partial<InventoryItemInput> & Pick<InventoryItemInput, 'supplierId'>
): Promise<InventoryItemRecord> {
  const payload = inventoryItemInput(overrides);
  const response = await client.post<{ success: boolean; data: InventoryItemRecord }>(
    '/inventory',
    payload
  );
  return response.data ?? (response as unknown as InventoryItemRecord);
}

export async function recordInventoryMovement(
  client: ApiClient,
  itemId: string,
  movement: InventoryMovementInput
): Promise<InventoryMovementRecord> {
  const response = await client.post<{ success: boolean; data: InventoryMovementRecord }>(
    `/inventory/${itemId}/movements`,
    movement
  );
  return response.data ?? (response as unknown as InventoryMovementRecord);
}
