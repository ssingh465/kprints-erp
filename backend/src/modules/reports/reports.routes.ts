import { Hono } from 'hono';
import { prisma } from '../../lib/prisma.js';
import { parsePeriodFromQuery } from '../../utils/period.js';
import { QuarterlyResultsService } from './quarterly-results.service.js';
import { ProfitLossService } from './profit-loss.service.js';
import { BalanceSheetService } from './balance-sheet.service.js';
import { CashFlowService } from './cash-flow.service.js';

const reportsApp = new Hono();
const quarterlyResults = new QuarterlyResultsService();
const profitLoss = new ProfitLossService();
const balanceSheet = new BalanceSheetService();
const cashFlow = new CashFlowService();

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
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `${targetModule}-report.csv`;

    if (targetModule === 'customers') {
      const data = await prisma.customer.findMany({ orderBy: { createdAt: 'desc' } });
      headers = ['ID', 'Name', 'Phone', 'Email', 'City', 'Source', 'lifetimeValue', 'orderCount', 'Created At'];
      rows = data.map(item => [
        item.id,
        item.name,
        item.phone,
        item.email,
        item.city,
        item.source,
        String(item.lifetimeValue),
        String(item.orderCount),
        item.createdAt.toISOString()
      ]);
    } else if (targetModule === 'inventory') {
      const data = await prisma.inventoryItem.findMany({
        orderBy: { category: 'asc' },
        include: { supplier: { select: { name: true } } }
      });
      headers = ['ID', 'SKU', 'Name', 'Category', 'Unit', 'Quantity', 'Reorder Level', 'Unit Cost', 'Supplier', 'Last Movement'];
      rows = data.map(item => [
        item.id,
        item.sku,
        item.name,
        item.category,
        item.unit,
        String(item.quantity),
        String(item.reorderLevel),
        String(item.unitCost),
        item.supplier?.name || '',
        item.lastMovement || ''
      ]);
    } else if (targetModule === 'expenses') {
      const data = await prisma.expense.findMany({ orderBy: { date: 'desc' } });
      headers = ['ID', 'Date', 'Category', 'Vendor', 'Amount', 'Payment Mode', 'Notes'];
      rows = data.map(item => [
        item.id,
        item.date.toISOString().split('T')[0],
        item.category,
        item.vendor,
        String(item.amount),
        item.paymentMode,
        item.notes || ''
      ]);
    } else {
      // Default to Orders
      const data = await prisma.order.findMany({
        orderBy: { orderNo: 'desc' },
        include: { lines: true }
      });
      headers = ['ID', 'Order No', 'Customer Name', 'Type', 'Channel', 'Status', 'Priority', 'Due Date', 'Total', 'Paid', 'Item Count'];
      rows = data.map(item => [
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
        String(item.lines.length)
      ]);
    }

    // Compile CSV Content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    // Return file download response
    c.header('Content-Type', 'text/csv; charset=utf-8');
    c.header('Content-Disposition', `attachment; filename="${filename}"`);
    return c.text(csvContent);
  } catch (error: any) {
    return c.json({
      success: false,
      error: 'ExportError',
      message: error.message
    }, 500);
  }
});

export default reportsApp;
