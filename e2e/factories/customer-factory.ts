/**
 * Customer factory. Builds ad-hoc Customer rows on top of the
 * deterministic TEST_* seed (which already includes 4 customers).
 *
 * Use the canonical TEST_CUSTOMER_* constants when a stable id matters
 * (workflow assertions, RBAC, dashboard); use `createCustomer()` when a
 * test needs a throwaway row (e.g. testing duplicate-email validation).
 */

import { ApiClient } from './api-client.js';

export interface CustomerInput {
  name?: string;
  phone?: string;
  email?: string;
  city?: string;
  source?: 'Offline' | 'Website' | 'Marketplace';
}

export interface CustomerRecord extends Required<CustomerInput> {
  id: string;
  lifetimeValue: number;
  orderCount: number;
  createdAt: string;
  updatedAt: string;
}

let counter = 0;

function uniqueSuffix(): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter.toString().padStart(3, '0')}`;
}

export function customerInput(overrides: CustomerInput = {}): Required<CustomerInput> {
  const suffix = uniqueSuffix();
  return {
    name: overrides.name ?? `TEST Customer ${suffix}`,
    phone: overrides.phone ?? `+91 80000 ${suffix.slice(-5).padStart(5, '0')}`,
    email: overrides.email ?? `customer-${suffix}@kprints.test`,
    city: overrides.city ?? 'Delhi',
    source: overrides.source ?? 'Offline',
  };
}

export async function createCustomer(
  client: ApiClient,
  overrides: CustomerInput = {}
): Promise<CustomerRecord> {
  const payload = customerInput(overrides);
  const response = await client.post<{ success: boolean; data: CustomerRecord }>(
    '/customers',
    payload
  );
  return response.data ?? (response as unknown as CustomerRecord);
}
