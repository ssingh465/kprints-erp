import { prisma } from '../../lib/prisma.js';
import {
  mockCustomers,
  mockPosters,
  mockSuppliers,
  mockInventory,
  mockOrders,
  mockPrintJobs,
  mockShipments,
  mockExpenses,
  mockCoupons,
  mockPartners,
  mockArtworks,
} from './seed-data.js';
import {
  buildLast6MonthStarts,
  buildMonthlyMetrics,
  buildHistoricalOrders,
  buildHistoricalExpenses,
} from './seed-history.js';

function addDays(anchor: Date, days: number): Date {
  const date = new Date(anchor);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

let setupRunning = false;

export class SetupService {
  async getStatus() {
    const settings = await prisma.settings.findFirst();
    if (!settings) {
      return {
        setupCompleted: false,
        demoMode: false,
        setupInProgress: false,
      };
    }
    return {
      setupCompleted: settings.setupCompleted,
      demoMode: settings.demoMode,
      setupInProgress: settings.setupInProgress,
    };
  }

  private async beginSetup(): Promise<void> {
    if (setupRunning) {
      throw new Error('A setup operation is already in progress');
    }

    setupRunning = true;
    const existing = await prisma.settings.findFirst();
    if (existing) {
      await prisma.settings.update({
        where: { id: existing.id },
        data: { setupInProgress: true, setupCompleted: false },
      });
      return;
    }

    await prisma.settings.create({
      data: {
        companyName: 'KPrints ERP',
        setupCompleted: false,
        demoMode: false,
        setupInProgress: true,
      },
    });
  }

  private async finishSetup(data: {
    companyName: string;
    demoMode: boolean;
  }) {
    await prisma.settings.deleteMany();
    const settings = await prisma.settings.create({
      data: {
        companyName: data.companyName,
        currency: 'INR',
        setupCompleted: true,
        demoMode: data.demoMode,
        setupInProgress: false,
      },
    });
    setupRunning = false;
    return settings;
  }

  private async abortSetup(): Promise<void> {
    setupRunning = false;
    await prisma.settings.updateMany({ data: { setupInProgress: false } });
  }

  async wipeDatabase() {
    console.log('Wiping database...');
    await prisma.orderPayment.deleteMany();
    await prisma.supplierPayment.deleteMany();
    await prisma.requestIdempotency.deleteMany();
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
    console.log('Database wiped successfully.');
  }

  private async syncCustomerStats(): Promise<void> {
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

  async initializeDemo() {
    await this.beginSetup();

    try {
      await this.wipeDatabase();

      console.log('Seeding demo data...');
      const anchor = new Date();

      await prisma.customer.createMany({ data: mockCustomers });
      await prisma.supplier.createMany({ data: mockSuppliers });
      await prisma.poster.createMany({ data: mockPosters });
      await prisma.inventoryItem.createMany({ data: mockInventory });

      const monthStarts = buildLast6MonthStarts(anchor);
      const monthlyMetrics = buildMonthlyMetrics(anchor);

      const historicalOrders = buildHistoricalOrders(monthStarts);
      for (const order of historicalOrders) {
        const { lines, createdAt, ...orderData } = order;
        await prisma.order.create({
          data: {
            ...orderData,
            createdAt,
            lines: { createMany: { data: lines } },
          },
        });
      }

      for (const order of mockOrders) {
        const { lines, ...orderData } = order;
        const dueOffset = order.orderNo === 'ORD-1048' ? 2
          : order.orderNo === 'ORD-1049' ? 1
          : order.orderNo === 'ORD-1050' ? 3
          : -1;

        await prisma.order.create({
          data: {
            ...orderData,
            dueDate: addDays(anchor, dueOffset),
            createdAt: addDays(anchor, -2),
            lines: { createMany: { data: lines } },
          },
        });
      }

      const printJobs = mockPrintJobs.map((job) => ({
        ...job,
        estimatedCompletion: addDays(anchor, job.jobNo === 'JOB-501' ? 1 : 2),
      }));
      await prisma.productionJob.createMany({ data: printJobs });

      const shipments = mockShipments.map((shipment) => ({
        ...shipment,
        eta: addDays(anchor, shipment.status === 'Delivered' ? -2 : 1),
      }));
      await prisma.shipment.createMany({ data: shipments });

      const historicalExpenses = buildHistoricalExpenses(monthStarts);
      const currentExpenses = mockExpenses.map((expense, index) => ({
        ...expense,
        date: addDays(anchor, -(5 - index)),
      }));

      await prisma.expense.createMany({
        data: [...historicalExpenses, ...currentExpenses],
      });

      await prisma.coupon.createMany({ data: mockCoupons });

      for (const partner of mockPartners) {
        const { investments, ...partnerData } = partner;
        await prisma.partner.create({
          data: {
            ...partnerData,
            investments: { create: investments },
          },
        });
      }

      await prisma.artworkUpload.createMany({ data: mockArtworks });

      for (const metric of monthlyMetrics) {
        await prisma.dashboardSnapshot.create({
          data: {
            revenue: metric.revenue,
            expenses: metric.expenses,
            orders: metric.orders,
            pendingPrintJobs: 0,
            inventoryAlerts: 0,
            profit: metric.revenue - metric.expenses,
          },
        });
      }

      await this.syncCustomerStats();

      const settings = await this.finishSetup({
        companyName: 'KPrints ERP Demo',
        demoMode: true,
      });

      console.log(
        `Demo data seeded: ${historicalOrders.length} historical + ${mockOrders.length} active orders across the last 2 quarters.`
      );
      return settings;
    } catch (error) {
      await this.abortSetup();
      throw error;
    }
  }

  async initializeFresh() {
    await this.beginSetup();

    try {
      await this.wipeDatabase();
      console.log('Initializing fresh blank database...');
      return await this.finishSetup({
        companyName: 'KPrints ERP',
        demoMode: false,
      });
    } catch (error) {
      await this.abortSetup();
      throw error;
    }
  }
}
