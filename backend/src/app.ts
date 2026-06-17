import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import setupApp from './modules/setup/setup.routes.js';
import customersApp from './modules/customers/customers.routes.js';
import postersApp from './modules/posters/posters.routes.js';
import inventoryApp from './modules/inventory/inventory.routes.js';
import ordersApp from './modules/orders/orders.routes.js';
import productionApp from './modules/production/production.routes.js';
import shipmentsApp from './modules/shipments/shipments.routes.js';
import expensesApp from './modules/expenses/expenses.routes.js';
import dashboardApp from './modules/dashboard/dashboard.routes.js';
import uploadApp from './modules/upload/upload.routes.js';
import reportsApp from './modules/reports/reports.routes.js';
import suppliersApp from './modules/suppliers/suppliers.routes.js';
import couponsApp from './modules/coupons/coupons.routes.js';
import artworksApp from './modules/artworks/artworks.routes.js';
import partnersApp from './modules/partners/partners.routes.js';
import financeApp from './modules/finance/finance.routes.js';
import invoicesApp from './modules/invoices/invoices.routes.js';
import paymentsApp from './modules/payments/payments.routes.js';
import posterCategoriesApp from './modules/poster-categories/poster-categories.routes.js';
import monthlyMetricsApp from './modules/finance/monthly-metrics.routes.js';
import authApp from './modules/auth/auth.routes.js';
import usersApp from './modules/users/users.routes.js';
import invitationsApp from './modules/users/invitations.routes.js';
import auditLogsApp from './modules/audit-logs/audit-logs.routes.js';
import { config, validateConfig, resolveCorsOrigin } from './config/index.js';

validateConfig();

const app = new Hono();

app.use('*', async (c, next) => {
  if (config.nodeEnv === 'production' && !config.databaseUrl) {
    return c.json(
      { success: false, error: 'ServerMisconfigured', message: 'DATABASE_URL is not configured.' },
      503
    );
  }
  await next();
});

// 1. Configure CORS
const corsOrigin = resolveCorsOrigin();
app.use(
  '*',
  cors({
    origin: corsOrigin,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-App-Mode', 'Idempotency-Key'],
    exposeHeaders: ['Content-Length', 'Content-Disposition'],
    maxAge: 600,
    credentials: corsOrigin !== '*',
  })
);

// 2. Define base API greeting
app.get('/api', (c) => {
  return c.json({
    success: true,
    message: 'Welcome to KPrints ERP REST API Engine',
    version: '1.0.0',
    status: 'Operational'
  });
});

// 3. Register Modular Routes
app.route('/api/auth', authApp);
app.route('/api/users', usersApp);
app.route('/api/invitations', invitationsApp);
app.route('/api/audit-logs', auditLogsApp);
app.route('/api/setup', setupApp);
app.route('/api/customers', customersApp);
app.route('/api/posters', postersApp);
app.route('/api/inventory', inventoryApp);
app.route('/api/orders', ordersApp);
app.route('/api/production', productionApp);
app.route('/api/shipments', shipmentsApp);
app.route('/api/expenses', expensesApp);
app.route('/api/dashboard', dashboardApp);
app.route('/api/upload', uploadApp);
app.route('/api/reports', reportsApp);
app.route('/api/suppliers', suppliersApp);
app.route('/api/coupons', couponsApp);
app.route('/api/artworks', artworksApp);
app.route('/api/partners', partnersApp);
app.route('/api/finance', financeApp);
app.route('/api/invoices', invoicesApp);
app.route('/api/payments', paymentsApp);
app.route('/api/poster-categories', posterCategoriesApp);
app.route('/api/monthly-metrics', monthlyMetricsApp);

// 4. Register OpenAPI Document JSON Placeholder
app.get('/api/openapi.json', (c) => {
  const idempotencyHeader = {
    name: 'Idempotency-Key',
    in: 'header' as const,
    required: false,
    schema: { type: 'string' },
    description: 'Optional key for safe POST retries on orders, expenses, and payments',
  };

  const jsonBody = (description: string) => ({
    required: true,
    content: { 'application/json': { schema: { type: 'object' } } },
    description,
  });

  const paths: Record<string, Record<string, unknown>> = {
    '/api/setup/status': { get: { summary: 'Check database initialization status', tags: ['Setup'] } },
    '/api/setup/demo': {
      post: {
        summary: 'Wipe and seed demo ERP data (requires confirm: RESET_PROD)',
        tags: ['Setup'],
        requestBody: jsonBody('Must include { confirm: "RESET_PROD" }'),
      },
    },
    '/api/setup/fresh': {
      post: {
        summary: 'Wipe and setup blank ERP (requires confirm: RESET_PROD)',
        tags: ['Setup'],
        requestBody: jsonBody('Must include { confirm: "RESET_PROD" }'),
      },
    },
    '/api/dashboard': { get: { summary: 'Fetch unified dashboard analytics KPIs', tags: ['Dashboard'] } },
    '/api/customers': { get: { summary: 'List and search customer records', tags: ['Customers'] } },
    '/api/orders': {
      get: { summary: 'List and query order operations', tags: ['Orders'] },
      post: { summary: 'Create order', tags: ['Orders'], parameters: [idempotencyHeader], requestBody: jsonBody('Order payload') },
    },
    '/api/orders/{id}': {
      get: { summary: 'Get order by id (includes payments)', tags: ['Orders'] },
      put: { summary: 'Update order status or details', tags: ['Orders'] },
      delete: { summary: 'Delete order', tags: ['Orders'] },
    },
    '/api/production': { get: { summary: 'List production jobs', tags: ['Production'] } },
    '/api/production/{id}/stage': { put: { summary: 'Update production stage', tags: ['Production'] } },
    '/api/production/{id}/operator': { put: { summary: 'Assign operator', tags: ['Production'] } },
    '/api/shipments': { get: { summary: 'List shipments', tags: ['Shipments'] } },
    '/api/expenses': {
      get: { summary: 'List expenses', tags: ['Expenses'] },
      post: { summary: 'Record expense', tags: ['Expenses'], parameters: [idempotencyHeader] },
    },
    '/api/invoices': {
      get: { summary: 'List invoices', tags: ['Finance'] },
      post: { summary: 'Create invoice for order', tags: ['Finance'] },
    },
    '/api/payments/orders/{orderId}': {
      get: { summary: 'List order payments', tags: ['Finance'] },
      post: { summary: 'Record order payment', tags: ['Finance'], parameters: [idempotencyHeader] },
    },
    '/api/payments/suppliers/{supplierId}': {
      get: { summary: 'List supplier payments', tags: ['Finance'] },
      post: { summary: 'Record supplier payment', tags: ['Finance'], parameters: [idempotencyHeader] },
    },
    '/api/poster-categories': {
      get: { summary: 'List poster categories', tags: ['Catalog'] },
      post: { summary: 'Create poster category', tags: ['Catalog'] },
    },
    '/api/artworks/{id}': { delete: { summary: 'Delete artwork upload and storage object', tags: ['Uploads'] } },
    '/api/upload': { post: { summary: 'Upload file to Supabase storage', tags: ['Uploads'] } },
    '/api/reports/export': { get: { summary: 'Export CSV for supported modules', tags: ['Reports'] } },
    '/api/coupons': { get: { summary: 'List coupons', tags: ['Coupons'] } },
    '/api/suppliers': { get: { summary: 'List suppliers', tags: ['Vendors'] } },
    '/api/partners': { get: { summary: 'List partners', tags: ['Finance'] } },
    '/api/audit-logs': { get: { summary: 'List audit logs', tags: ['Admin'] } },
  };

  return c.json({
    openapi: '3.0.0',
    info: {
      title: 'KPrints ERP REST APIs',
      version: '1.0.0',
      description: 'API documentation for KPrints ERP print & sales operations',
    },
    tags: [
      { name: 'Setup' },
      { name: 'Dashboard' },
      { name: 'Customers' },
      { name: 'Orders' },
      { name: 'Production' },
      { name: 'Shipments' },
      { name: 'Expenses' },
      { name: 'Finance' },
      { name: 'Catalog' },
      { name: 'Uploads' },
      { name: 'Reports' },
      { name: 'Coupons' },
      { name: 'Vendors' },
      { name: 'Admin' },
    ],
    paths,
  });
});

// 5. Register Global Error Handlers
app.onError(errorHandler);
app.notFound(notFoundHandler);

// 6. Launch Server locally if running direct script
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const { serve } = await import('@hono/node-server');
  console.log(`KPrints ERP Backend starting on http://localhost:${config.port}`);
  serve({
    fetch: app.fetch,
    port: config.port
  });
}

export default app;
