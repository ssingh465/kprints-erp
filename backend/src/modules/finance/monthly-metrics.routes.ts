import { Hono } from 'hono';
import { parsePeriodFromQuery } from '../../utils/period.js';
import { FinanceService } from './finance.service.js';
import { protect } from '../../middleware/protect.js';
import type { AuthVariables } from '../../types/auth.js';

const monthlyMetricsApp = new Hono<{ Variables: AuthVariables }>();
const service = new FinanceService();

monthlyMetricsApp.use('*', ...protect('reports'));

monthlyMetricsApp.get('/', async (c) => {
  const period = parsePeriodFromQuery(c.req.query());
  const result = await service.getMonthlyMetrics(period);
  return c.json({ success: true, data: result });
});

export default monthlyMetricsApp;
