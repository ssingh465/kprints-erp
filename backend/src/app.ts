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
import { config } from './config/index.js';

const app = new Hono();

// 1. Configure CORS
app.use(
  '*',
  cors({
    origin: '*', // In production, refine to your frontend Vercel domain
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length', 'Content-Disposition'],
    maxAge: 600,
    credentials: true
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

// 4. Register OpenAPI Document JSON Placeholder
app.get('/api/openapi.json', (c) => {
  return c.json({
    openapi: '3.0.0',
    info: {
      title: 'KPrints ERP REST APIs',
      version: '1.0.0',
      description: 'API documentation for KPrints ERP print & sales operations'
    },
    paths: {
      '/api/setup/status': { get: { summary: 'Check database initialization status' } },
      '/api/setup/demo': { post: { summary: 'Wipe and seed demo ERP data' } },
      '/api/setup/fresh': { post: { summary: 'Wipe and setup blank ERP' } },
      '/api/dashboard': { get: { summary: 'Fetch unified dashboard analytics KPIs' } },
      '/api/customers': { get: { summary: 'List and search customer records' } },
      '/api/orders': { get: { summary: 'List and query order operations' } }
    }
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
