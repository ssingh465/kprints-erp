import { Hono } from 'hono';
import { parsePeriodFromQuery } from '../../utils/period.js';
import { DashboardService } from './dashboard.service.js';
import { protect } from '../../middleware/protect.js';
import type { AuthVariables } from '../../types/auth.js';

const dashboardApp = new Hono<{ Variables: AuthVariables }>();
const service = new DashboardService();

dashboardApp.use('*', ...protect('dashboard'));

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

dashboardApp.get('/signals', async (c) => {
  try {
    const data = await service.getOperationalSignals();
    return c.json({
      success: true,
      data
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: 'DashboardSignalsError',
      message: error.message
    }, 500);
  }
});

export default dashboardApp;
