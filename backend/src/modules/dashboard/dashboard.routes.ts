import { Hono } from 'hono';
import { DashboardService } from './dashboard.service.js';

const dashboardApp = new Hono();
const service = new DashboardService();

dashboardApp.get('/', async (c) => {
  try {
    const data = await service.getMetrics();
    return c.json({
      success: true,
      data
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: 'DashboardFetchError',
      message: error.message
    }, 500);
  }
});

export default dashboardApp;
