import { Hono } from 'hono';
import { parsePeriodFromQuery } from '../../utils/period.js';
import { FinanceService } from './finance.service.js';

const monthlyMetricsApp = new Hono();
const service = new FinanceService();

monthlyMetricsApp.get('/', async (c) => {
  const period = parsePeriodFromQuery(c.req.query());
  const result = await service.getMonthlyMetrics(period);
  return c.json({ success: true, data: result });
});

export default monthlyMetricsApp;
