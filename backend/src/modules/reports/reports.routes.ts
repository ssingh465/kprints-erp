import { Hono } from 'hono';
import { prisma } from '../../lib/prisma.js';
import { createdAtInPeriod, dateInPeriod, parsePeriodFromQuery } from '../../utils/period.js';
import { QuarterlyResultsService } from './quarterly-results.service.js';
import { ProfitLossService } from './profit-loss.service.js';
import { BalanceSheetService } from './balance-sheet.service.js';
import { CashFlowService } from './cash-flow.service.js';
import { protect } from '../../middleware/protect.js';
import type { AuthVariables } from '../../types/auth.js';

const reportsApp = new Hono<{ Variables: AuthVariables }>();
const quarterlyResults = new QuarterlyResultsService();
const profitLoss = new ProfitLossService();
const balanceSheet = new BalanceSheetService();
const cashFlow = new CashFlowService();

reportsApp.use('*', ...protect('reports'));

// Helper to escape CSV fields
function escapeCSV(val: any): string {
  if (val === null || val === undefined) return '';
  let str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  str = str.replace(/"/g, '""');
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str}"`;
  }
  return str;
}

// Financial statements always use all available ERP data (last 8 period columns).
const financialReportPeriod = () => parsePeriodFromQuery({}, 'all');

reportsApp.get('/financial/quarterly', async (c) => {
  const statement = await quarterlyResults.getStatement(financialReportPeriod());
  return c.json({ success: true, data: statement });
});

reportsApp.get('/financial/pnl', async (c) => {
  const statement = await profitLoss.getStatement(financialReportPeriod());
  return c.json({ success: true, data: statement });
});

reportsApp.get('/financial/balance-sheet', async (c) => {
  const statement = await balanceSheet.getStatement(financialReportPeriod());
  return c.json({ success: true, data: statement });
});

reportsApp.get('/financial/cash-flow', async (c) => {
  const statement = await cashFlow.getStatement(financialReportPeriod());
  return c.json({ success: true, data: statement });
});

// Generate CSV and Stream/Download
reportsApp.get('/export', async (c) => {
  try {
    const targetModule = c.req.query('module') || 'orders';
    const periodQuery = c.req.query('period');
    const period = periodQuery ? parsePeriodFromQuery(c.req.query()) : undefined;

    const supported = new Set([
      'customers',
      'inventory',
      'expenses',
      'orders',
      'posters',
      'shipments',
      'production',
      'partners',
      'audit-logs',
    ]);

    if (!supported.has(targetModule)) {
      return c.json({
        success: false,
        error: 'InvalidModule',
        message: `Unsupported export module "${targetModule}". Supported: ${[...supported].join(', ')}`,
      }, 400);
    }

    let headers: string[] = [];
    let rows: string[][] = [];
    const filename = `${targetModule}-report.csv`;

    if (targetModule === 'customers') {
      const where = period ? createdAtInPeriod(period) : {};
      const data = await prisma.customer.findMany({ where, orderBy: { createdAt: 'desc' } });
      headers = ['ID', 'Name', 'Phone', 'Email', 'City', 'Source', 'lifetimeValue', 'orderCount', 'Created At'];
      rows = data.map((item) => [
        item.id,
        item.name,
        item.phone,
        item.email,
        item.city,
        item.source,
        String(item.lifetimeValue),
        String(item.orderCount),
        item.createdAt.toISOString(),
      ]);
    } else if (targetModule === 'inventory') {
      const data = await prisma.inventoryItem.findMany({
        orderBy: { category: 'asc' },
        include: { supplier: { select: { name: true } } },
      });
      headers = ['ID', 'SKU', 'Name', 'Category', 'Unit', 'Quantity', 'Reorder Level', 'Unit Cost', 'Supplier', 'Last Movement'];
      rows = data.map((item) => [
        item.id,
        item.sku,
        item.name,
        item.category,
        item.unit,
        String(item.quantity),
        String(item.reorderLevel),
        String(item.unitCost),
        item.supplier?.name || '',
        item.lastMovement || '',
      ]);
    } else if (targetModule === 'expenses') {
      const where = period ? dateInPeriod(period) : {};
      const data = await prisma.expense.findMany({ where, orderBy: { date: 'desc' } });
      headers = ['ID', 'Date', 'Category', 'Vendor', 'Amount', 'Payment Mode', 'Notes'];
      rows = data.map((item) => [
        item.id,
        item.date.toISOString().split('T')[0],
        item.category,
        item.vendor,
        String(item.amount),
        item.paymentMode,
        item.notes || '',
      ]);
    } else if (targetModule === 'posters') {
      const where = period ? createdAtInPeriod(period) : {};
      const data = await prisma.poster.findMany({ where, orderBy: { createdAt: 'desc' } });
      headers = ['ID', 'SKU', 'Title', 'Category', 'Size', 'Price', 'Stock', 'Active', 'Created At'];
      rows = data.map((item) => [
        item.id,
        item.sku,
        item.title,
        item.category,
        item.size,
        String(item.price),
        String(item.stock),
        String(item.active),
        item.createdAt.toISOString(),
      ]);
    } else if (targetModule === 'shipments') {
      const where = period ? createdAtInPeriod(period) : {};
      const data = await prisma.shipment.findMany({ where, orderBy: { createdAt: 'desc' } });
      headers = ['ID', 'Order No', 'Customer', 'Carrier', 'Tracking', 'Status', 'City', 'ETA'];
      rows = data.map((item) => [
        item.id,
        item.orderNo,
        item.customerName,
        item.carrier,
        item.trackingNo,
        item.status,
        item.city,
        item.eta ? item.eta.toISOString().split('T')[0] : '',
      ]);
    } else if (targetModule === 'production') {
      const where = period ? createdAtInPeriod(period) : {};
      const data = await prisma.productionJob.findMany({ where, orderBy: { createdAt: 'desc' } });
      headers = ['ID', 'Job No', 'Order No', 'Customer', 'Stage', 'Priority', 'Operator', 'Created At'];
      rows = data.map((item) => [
        item.id,
        item.jobNo,
        item.orderNo,
        item.customerName,
        item.stage,
        item.priority,
        item.operator ?? '',
        item.createdAt.toISOString(),
      ]);
    } else if (targetModule === 'partners') {
      const data = await prisma.partner.findMany({ orderBy: { createdAt: 'desc' } });
      headers = ['ID', 'Name', 'Profit Share %', 'Created At'];
      rows = data.map((item) => [
        item.id,
        item.name,
        String(item.profitSharePercent),
        item.createdAt.toISOString(),
      ]);
    } else if (targetModule === 'audit-logs') {
      const where = period ? createdAtInPeriod(period) : {};
      const data = await prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' } });
      headers = ['ID', 'User ID', 'Action', 'Entity', 'Entity ID', 'Metadata', 'Created At'];
      rows = data.map((item) => [
        item.id,
        item.userId ?? '',
        item.action,
        item.entity,
        item.entityId ?? '',
        item.metadata ? JSON.stringify(item.metadata) : '',
        item.createdAt.toISOString(),
      ]);
    } else {
      const where = period ? createdAtInPeriod(period) : {};
      const data = await prisma.order.findMany({
        where,
        orderBy: { orderNo: 'desc' },
        include: { lines: true },
      });
      headers = ['ID', 'Order No', 'Customer Name', 'Type', 'Channel', 'Status', 'Priority', 'Due Date', 'Total', 'Paid', 'Discount', 'Item Count'];
      rows = data.map((item) => [
        item.id,
        item.orderNo,
        item.customerName,
        item.type,
        item.channel,
        item.status,
        item.priority,
        item.dueDate.toISOString().split('T')[0],
        String(item.total),
        String(item.paid),
        String(item.discount),
        String(item.lines.length),
      ]);
    }

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map(escapeCSV).join(',')),
    ].join('\n');

    c.header('Content-Type', 'text/csv; charset=utf-8');
    c.header('Content-Disposition', `attachment; filename="${filename}"`);
    return c.text(csvContent);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Export failed';
    return c.json({
      success: false,
      error: 'ExportError',
      message,
    }, 500);
  }
});

export default reportsApp;
