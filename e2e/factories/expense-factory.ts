/**
 * Expense factory.
 *
 * Reminder (workflow-map.md §7 + missing-functionality-report.md §G14):
 *   - There is NO PUT endpoint — expenses cannot be edited.
 *   - DELETE does NOT roll back the supplier outstanding decrement.
 */

import { ApiClient } from './api-client.js';

export interface ExpenseInput {
  date?: string | Date;
  category?: string;
  vendor?: string;
  supplierId?: string;
  amount?: number;
  paymentMode?: 'Cash' | 'UPI' | 'Card' | 'Bank Transfer';
  notes?: string;
}

export interface ExpenseRecord {
  id: string;
  date: string;
  category: string;
  vendor: string;
  supplierId: string | null;
  amount: number;
  paymentMode: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

let counter = 0;

export function expenseInput(overrides: ExpenseInput = {}): {
  date: string;
  category: string;
  vendor: string;
  supplierId?: string;
  amount: number;
  paymentMode: 'Cash' | 'UPI' | 'Card' | 'Bank Transfer';
  notes: string;
} {
  counter += 1;
  const date =
    typeof overrides.date === 'string'
      ? overrides.date
      : overrides.date
        ? overrides.date.toISOString()
        : new Date().toISOString();

  return {
    date,
    category: overrides.category ?? 'Materials',
    vendor: overrides.vendor ?? `TEST Vendor ${counter}`,
    supplierId: overrides.supplierId,
    amount: overrides.amount ?? 100,
    paymentMode: overrides.paymentMode ?? 'UPI',
    notes: overrides.notes ?? `TEST expense ${counter}`,
  };
}

export async function createExpense(
  client: ApiClient,
  overrides: ExpenseInput = {}
): Promise<ExpenseRecord> {
  const payload = expenseInput(overrides);
  const response = await client.post<{ success: boolean; data: ExpenseRecord }>(
    '/expenses',
    payload
  );
  return response.data ?? (response as unknown as ExpenseRecord);
}
