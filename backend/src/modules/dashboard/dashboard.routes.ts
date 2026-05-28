import { Hono } from 'hono';
import { parsePeriodFromQuery } from '../../utils/period.js';
import { DashboardService } from './dashboard.service.js';

const dashboardApp = new Hono();
const service = new DashboardService();

dashboardApp.get('/', async (c) => {
  try {
    const period = parsePeriodFromQuery(c.req.query());
    const data = await service.getMetrics(period);
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
