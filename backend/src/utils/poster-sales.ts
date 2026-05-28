import { prisma } from '../lib/prisma.js';
import { createdAtInPeriod, ResolvedPeriod } from './period.js';

/** Sum order line quantities per poster within the given period (by order createdAt). */
export async function getPosterSalesInPeriod(period: ResolvedPeriod): Promise<Map<string, number>> {
  const lines = await prisma.orderItem.findMany({
    where: {
      posterId: { not: null },
      order: createdAtInPeriod(period),
    },
    select: {
      posterId: true,
      quantity: true,
    },
  });

  const sales = new Map<string, number>();
  for (const line of lines) {
    if (!line.posterId) {
      continue;
    }
    sales.set(line.posterId, (sales.get(line.posterId) ?? 0) + line.quantity);
  }

  return sales;
}

export function applyPosterSales<T extends { id: string; soldThisMonth: number }>(
  posters: T[],
  sales: Map<string, number>
): T[] {
  return posters.map((poster) => ({
    ...poster,
    soldThisMonth: sales.get(poster.id) ?? 0,
  }));
}
