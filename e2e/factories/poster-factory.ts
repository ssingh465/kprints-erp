/**
 * Poster (catalog) factory.
 *
 * Notes:
 *  - Per workflow-map.md §3, `Poster.stock` is NOT decremented when an
 *    order is placed (gap G1). Tests asserting stock changes must drive
 *    those changes explicitly via inventory or future order-inventory
 *    fixes.
 *  - Categories are free-text strings on `Poster.category`; the
 *    `categoryId` FK to `PosterCategory` is not used by the catalog UI.
 */

import { ApiClient } from './api-client.js';

export interface PosterInput {
  sku?: string;
  title?: string;
  category?: string;
  tags?: string[];
  size?: string;
  price?: number;
  stock?: number;
  active?: boolean;
}

export interface PosterRecord extends Required<Omit<PosterInput, 'tags'>> {
  id: string;
  tags: string[];
  soldThisMonth: number;
  createdAt: string;
  updatedAt: string;
}

let counter = 0;

function uniqueSku(): string {
  counter += 1;
  return `TST-POS-${Date.now().toString(36).toUpperCase()}-${counter
    .toString()
    .padStart(3, '0')}`;
}

export function posterInput(overrides: PosterInput = {}): Required<Omit<PosterInput, 'tags'>> & {
  tags: string[];
} {
  return {
    sku: overrides.sku ?? uniqueSku(),
    title: overrides.title ?? `TEST Poster ${counter}`,
    category: overrides.category ?? 'Minimal',
    tags: overrides.tags ?? ['test'],
    size: overrides.size ?? '18 x 24 in',
    price: overrides.price ?? 500,
    stock: overrides.stock ?? 25,
    active: overrides.active ?? true,
  };
}

export async function createPoster(
  client: ApiClient,
  overrides: PosterInput = {}
): Promise<PosterRecord> {
  const payload = posterInput(overrides);
  const response = await client.post<{ success: boolean; data: PosterRecord }>(
    '/posters',
    payload
  );
  return response.data ?? (response as unknown as PosterRecord);
}
