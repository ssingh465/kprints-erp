/**
 * TEST-database reset + seed pipeline. Used by both:
 *   - backend/scripts/test-reset.ts (operator CLI)
 *   - e2e/global-setup.ts (Playwright suite)
 *
 * Safety:
 *   - Refuses to run unless `assertTestEnvironment()` accepts the
 *     current process env.
 *   - Preserves `app_users` and `user_invitations` so QA personas
 *     provisioned via seed-qa-users survive between runs.
 *   - Wipes `audit_logs` by default so workflow tests start from a
 *     known-empty audit trail; pass `{ preserveAuditLogs: true }` to
 *     keep them.
 */

import { PrismaClient } from '@prisma/client';
import { assertTestEnvironment } from './test-env-guard.js';
import { buildTestSeedSnapshot, type TestSeedSnapshot } from './test-seed-data.js';

export interface ResetAndSeedOptions {
  /** Optional shared Prisma client. A fresh client is created if omitted. */
  prisma?: PrismaClient;
  /** Pin a deterministic anchor date — useful for snapshot tests. */
  anchor?: Date;
  /** Skip wiping `audit_logs` (default: false). */
  preserveAuditLogs?: boolean;
  /** Suppress per-step console output (Playwright globalSetup uses this). */
  silent?: boolean;
}

export interface ResetAndSeedResult {
  anchor: Date;
  snapshot: TestSeedSnapshot;
  durationMs: number;
}

function log(silent: boolean, ...args: unknown[]): void {
  if (!silent) console.log(...args);
}

async function wipeTransactionalTables(prisma: PrismaClient, preserveAuditLogs: boolean): Promise<void> {
  // Order matters — children before parents to satisfy FK constraints.
  // Mirrors SetupService.wipeDatabase but explicitly preserves
  // app_users and user_invitations (QA persona durability).
  await prisma.orderItem.deleteMany();
  await prisma.productionJob.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.artworkUpload.deleteMany();
  await prisma.order.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.partnerInvestment.deleteMany();
  await prisma.partner.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.poster.deleteMany();
  await prisma.posterCategory.deleteMany();
  await prisma.dashboardSnapshot.deleteMany();
  await prisma.settings.deleteMany();
  if (!preserveAuditLogs) {
    await prisma.auditLog.deleteMany();
  }
}

async function applySeed(
  prisma: PrismaClient,
  snapshot: TestSeedSnapshot,
  silent: boolean
): Promise<void> {
  log(silent, '[test-seeder] inserting customers, posters, suppliers, inventory...');
  await prisma.customer.createMany({ data: snapshot.customers });
  await prisma.supplier.createMany({ data: snapshot.suppliers });
  await prisma.poster.createMany({ data: snapshot.posters });
  await prisma.inventoryItem.createMany({ data: snapshot.inventory });

  log(silent, '[test-seeder] inserting orders + order items...');
  for (const order of snapshot.orders) {
    const { lines, createdAt, ...orderData } = order;
    await prisma.order.create({
      data: {
        ...orderData,
        createdAt,
        lines: { createMany: { data: lines } },
      },
    });
  }

  log(silent, '[test-seeder] inserting production jobs + shipments...');
  await prisma.productionJob.createMany({ data: snapshot.productionJobs });
  await prisma.shipment.createMany({ data: snapshot.shipments });

  log(silent, '[test-seeder] inserting expenses, coupons, partners...');
  await prisma.expense.createMany({ data: snapshot.expenses });
  await prisma.coupon.createMany({ data: snapshot.coupons });
  for (const partner of snapshot.partners) {
    const { investments, ...partnerData } = partner;
    await prisma.partner.create({
      data: {
        ...partnerData,
        investments: { create: investments },
      },
    });
  }

  log(silent, '[test-seeder] reconciling customer aggregates...');
  await syncCustomerAggregates(prisma);

  log(silent, '[test-seeder] writing settings row...');
  await prisma.settings.create({ data: snapshot.settings });
}

/**
 * Recompute `customer.orderCount` and `customer.lifetimeValue` from
 * the actual orders just inserted. Mirrors SetupService.syncCustomerStats
 * but kept local so the TEST seeder does not depend on SetupService.
 */
async function syncCustomerAggregates(prisma: PrismaClient): Promise<void> {
  const customers = await prisma.customer.findMany({ select: { id: true } });
  for (const customer of customers) {
    const orders = await prisma.order.findMany({
      where: { customerId: customer.id },
      select: { total: true },
    });
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        orderCount: orders.length,
        lifetimeValue: orders.reduce((sum, order) => sum + order.total, 0),
      },
    });
  }
}

/**
 * Wipe the TEST database (preserving QA personas + audit logs by request)
 * and re-seed it with the deterministic TEST_* fixture set.
 */
export async function resetAndSeedTestDatabase(
  options: ResetAndSeedOptions = {}
): Promise<ResetAndSeedResult> {
  const guard = assertTestEnvironment(process.env);
  const silent = options.silent ?? false;
  log(
    silent,
    `[test-seeder] guard accepted DATABASE_URL host="${guard.host}" (${guard.allowedReason}).`
  );

  const prisma = options.prisma ?? new PrismaClient();
  const ownedClient = !options.prisma;
  const anchor = options.anchor ?? new Date();
  const snapshot = buildTestSeedSnapshot(anchor);
  const preserveAuditLogs = options.preserveAuditLogs ?? false;

  const startedAt = Date.now();
  try {
    log(silent, '[test-seeder] wiping transactional tables (preserving app_users)...');
    await wipeTransactionalTables(prisma, preserveAuditLogs);
    await applySeed(prisma, snapshot, silent);
  } finally {
    if (ownedClient) {
      await prisma.$disconnect();
    }
  }

  const durationMs = Date.now() - startedAt;
  log(silent, `[test-seeder] done in ${durationMs}ms — anchor=${anchor.toISOString()}.`);
  return { anchor, snapshot, durationMs };
}
