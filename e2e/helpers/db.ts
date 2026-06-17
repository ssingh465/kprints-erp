/**
 * Prisma-backed assertions for workflow E2E (UI = API = DB triangulation).
 *
 * Uses the backend singleton Prisma client against TEST `DATABASE_URL`.
 * Callers must load `.env.test` and pass `assertTestEnvironment()` first.
 */

import type { PrismaClient } from '@prisma/client';
import { assertTestEnvironment } from '../../backend/src/test/test-env-guard.js';

export class TestDbHelper {
  private constructor(private readonly prisma: PrismaClient) {}

  static async create(): Promise<TestDbHelper> {
    assertTestEnvironment();
    const { prisma } = await import('../../backend/src/lib/prisma.js');
    return new TestDbHelper(prisma);
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  getCustomer(id: string) {
    return this.prisma.customer.findUnique({ where: { id } });
  }

  getOrder(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        lines: true,
        productionJob: true,
        shipment: true,
      },
    });
  }

  getProductionJobByOrderId(orderId: string) {
    return this.prisma.productionJob.findUnique({ where: { orderId } });
  }

  getShipmentByOrderId(orderId: string) {
    return this.prisma.shipment.findUnique({ where: { orderId } });
  }

  getPoster(id: string) {
    return this.prisma.poster.findUnique({ where: { id } });
  }

  getInventoryItem(id: string) {
    return this.prisma.inventoryItem.findUnique({ where: { id } });
  }

  getSupplier(id: string) {
    return this.prisma.supplier.findUnique({ where: { id } });
  }

  countInventoryMovements(reference?: string) {
    return this.prisma.inventoryMovement.count({
      where: reference ? { reference } : undefined,
    });
  }

  findAuditLogs(filter: { entity: string; entityId?: string; action?: string }) {
    return this.prisma.auditLog.findMany({
      where: {
        entity: filter.entity,
        ...(filter.entityId ? { entityId: filter.entityId } : {}),
        ...(filter.action ? { action: filter.action } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  sumExpensesInPeriod(from: Date, to: Date) {
    return this.prisma.expense.aggregate({
      where: { date: { gte: from, lte: to } },
      _sum: { amount: true },
    });
  }
}
