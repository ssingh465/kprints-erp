/**
 * Supplier (vendor) factory.
 *
 * Note: workflow-map.md §7 records a side-effect — `ExpensesService.create`
 * decrements `supplier.outstanding` unconditionally when `supplierId` is
 * set, and there is NO rollback on expense delete. Tests asserting
 * supplier outstanding must therefore drive deletes carefully or use a
 * fresh supplier per test.
 */

import { ApiClient } from './api-client.js';

export interface SupplierInput {
  name?: string;
  contact?: string;
  phone?: string;
  category?: string;
  outstanding?: number;
}

export interface SupplierRecord extends Required<SupplierInput> {
  id: string;
  createdAt: string;
  updatedAt: string;
}

let counter = 0;

function uniqueLabel(): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter.toString().padStart(3, '0')}`;
}

export function supplierInput(overrides: SupplierInput = {}): Required<SupplierInput> {
  const suffix = uniqueLabel();
  return {
    name: overrides.name ?? `TEST Supplier ${suffix}`,
    contact: overrides.contact ?? `TEST Contact ${suffix}`,
    phone: overrides.phone ?? `+91 81000 ${suffix.slice(-5).padStart(5, '0')}`,
    category: overrides.category ?? 'Paper Rolls',
    outstanding: overrides.outstanding ?? 0,
  };
}

export async function createSupplier(
  client: ApiClient,
  overrides: SupplierInput = {}
): Promise<SupplierRecord> {
  const payload = supplierInput(overrides);
  const response = await client.post<{ success: boolean; data: SupplierRecord }>(
    '/suppliers',
    payload
  );
  return response.data ?? (response as unknown as SupplierRecord);
}
