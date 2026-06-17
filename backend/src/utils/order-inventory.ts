import type { Prisma } from '@prisma/client';

type TransactionClient = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export const STOCK_CONSUMPTION_STATUSES = new Set([
  'Printing Queued',
  'Printing In Progress',
  'Lamination',
  'Framing',
  'Packaging',
  'Ready for Pickup',
  'Ready for Shipping',
  'Delivered',
]);

export function consumesStock(status: string): boolean {
  return STOCK_CONSUMPTION_STATUSES.has(status);
}

type OrderLine = { posterId: string | null; quantity: number };

export async function consumeLinkedInventoryMaterials(
  tx: TransactionClient,
  lines: OrderLine[],
  orderNo: string
): Promise<void> {
  for (const line of lines) {
    if (!line.posterId) continue;

    const poster = await tx.poster.findUnique({ where: { id: line.posterId } });
    if (!poster) continue;

    const inventoryItem = await tx.inventoryItem.findFirst({
      where: { sku: poster.sku },
    });
    if (!inventoryItem) continue;

    if (inventoryItem.quantity < line.quantity) {
      throw new Error(
        `Insufficient inventory for ${inventoryItem.sku}: need ${line.quantity}, have ${inventoryItem.quantity}`
      );
    }

    await tx.inventoryItem.update({
      where: { id: inventoryItem.id },
      data: {
        quantity: { decrement: line.quantity },
        lastMovement: `Consumption for ${orderNo}`,
      },
    });

    await tx.inventoryMovement.create({
      data: {
        inventoryItemId: inventoryItem.id,
        quantity: -line.quantity,
        type: 'Consumption',
        reference: orderNo,
        notes: `Poster line consumption (${poster.title})`,
      },
    });
  }
}

export async function restoreLinkedInventoryMaterials(
  tx: TransactionClient,
  lines: OrderLine[],
  orderNo: string
): Promise<void> {
  for (const line of lines) {
    if (!line.posterId) continue;

    const poster = await tx.poster.findUnique({ where: { id: line.posterId } });
    if (!poster) continue;

    const inventoryItem = await tx.inventoryItem.findFirst({
      where: { sku: poster.sku },
    });
    if (!inventoryItem) continue;

    await tx.inventoryItem.update({
      where: { id: inventoryItem.id },
      data: {
        quantity: { increment: line.quantity },
        lastMovement: `Restored from ${orderNo}`,
      },
    });

    await tx.inventoryMovement.create({
      data: {
        inventoryItemId: inventoryItem.id,
        quantity: line.quantity,
        type: 'Adjustment',
        reference: orderNo,
        notes: `Order cancellation restore (${poster.title})`,
      },
    });
  }
}

export async function applyStockConsumption(
  tx: TransactionClient,
  lines: OrderLine[],
  orderNo: string
): Promise<void> {
  await consumePosterStock(tx, lines);
  await consumeLinkedInventoryMaterials(tx, lines, orderNo);
}

export async function restoreStockConsumption(
  tx: TransactionClient,
  lines: OrderLine[],
  orderNo: string
): Promise<void> {
  await restorePosterStock(tx, lines);
  await restoreLinkedInventoryMaterials(tx, lines, orderNo);
}

export async function consumePosterStock(
  tx: TransactionClient,
  lines: OrderLine[]
): Promise<void> {
  for (const line of lines) {
    if (!line.posterId) continue;

    const poster = await tx.poster.findUnique({ where: { id: line.posterId } });
    if (!poster) {
      throw new Error(`Poster ${line.posterId} not found`);
    }
    if (poster.stock < line.quantity) {
      throw new Error(
        `Insufficient stock for ${poster.sku}: need ${line.quantity}, have ${poster.stock}`
      );
    }

    await tx.poster.update({
      where: { id: line.posterId },
      data: { stock: { decrement: line.quantity } },
    });
  }
}

export async function restorePosterStock(
  tx: TransactionClient,
  lines: OrderLine[]
): Promise<void> {
  for (const line of lines) {
    if (!line.posterId) continue;

    await tx.poster.update({
      where: { id: line.posterId },
      data: { stock: { increment: line.quantity } },
    });
  }
}

export async function syncCustomerStats(
  tx: TransactionClient,
  customerId: string
): Promise<void> {
  const orders = await tx.order.findMany({
    where: { customerId },
    select: { total: true },
  });

  await tx.customer.update({
    where: { id: customerId },
    data: {
      orderCount: orders.length,
      lifetimeValue: orders.reduce((sum, order) => sum + order.total, 0),
    },
  });
}
