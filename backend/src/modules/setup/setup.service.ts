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
  mockMonthlyMetrics
} from './seed-data.js';

export class SetupService {
  async getStatus() {
    const settings = await prisma.settings.findFirst();
    if (!settings) {
      return {
        setupCompleted: false,
        demoMode: false
      };
    }
    return {
      setupCompleted: settings.setupCompleted,
      demoMode: settings.demoMode
    };
  }

  async wipeDatabase() {
    console.log('Wiping database...');
    // Order matters to satisfy foreign keys
    await prisma.orderItem.deleteMany();
    await prisma.productionJob.deleteMany();
    await prisma.shipment.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.artworkUpload.deleteMany();
    await prisma.order.deleteMany();
    await prisma.inventoryMovement.deleteMany();
    await prisma.inventoryItem.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.poster.deleteMany();
    await prisma.posterCategory.deleteMany();
    await prisma.dashboardSnapshot.deleteMany();
    await prisma.settings.deleteMany();
    console.log('Database wiped successfully.');
  }

  async initializeDemo() {
    await this.wipeDatabase();

    console.log('Seeding demo data...');

    // 1. Seed Customers
    await prisma.customer.createMany({
      data: mockCustomers
    });

    // 2. Seed Suppliers
    await prisma.supplier.createMany({
      data: mockSuppliers
    });

    // 3. Seed Posters
    await prisma.poster.createMany({
      data: mockPosters
    });

    // 4. Seed Inventory items
    await prisma.inventoryItem.createMany({
      data: mockInventory
    });

    // 5. Seed Orders (Orders must be created one by one to also create nested order items)
    for (const order of mockOrders) {
      const { lines, ...orderData } = order;
      await prisma.order.create({
        data: {
          ...orderData,
          lines: {
            createMany: {
              data: lines
            }
          }
        }
      });
    }

    // 6. Seed Print Jobs
    await prisma.productionJob.createMany({
      data: mockPrintJobs
    });

    // 7. Seed Shipments
    await prisma.shipment.createMany({
      data: mockShipments
    });

    // 8. Seed Expenses
    await prisma.expense.createMany({
      data: mockExpenses
    });

    // 9. Seed Monthly Metrics / snapshots (we can store these in dashboard snapshots)
    for (const metric of mockMonthlyMetrics) {
      await prisma.dashboardSnapshot.create({
        data: {
          revenue: metric.revenue,
          expenses: metric.expenses,
          orders: metric.orders,
          pendingPrintJobs: 0,
          inventoryAlerts: 0,
          profit: metric.revenue - metric.expenses
        }
      });
    }

    // 10. Create settings
    const settings = await prisma.settings.create({
      data: {
        companyName: 'KPrints ERP Demo',
        currency: 'INR',
        setupCompleted: true,
        demoMode: true
      }
    });

    console.log('Demo data seeded successfully.');
    return settings;
  }

  async initializeFresh() {
    await this.wipeDatabase();

    console.log('Initializing fresh blank database...');

    const settings = await prisma.settings.create({
      data: {
        companyName: 'KPrints ERP',
        currency: 'INR',
        setupCompleted: true,
        demoMode: false
      }
    });

    console.log('Blank database initialized successfully.');
    return settings;
  }
}
