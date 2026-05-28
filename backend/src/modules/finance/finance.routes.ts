import { Hono } from 'hono';
import { parsePeriodFromQuery } from '../../utils/period.js';
import { FinanceService } from './finance.service.js';

const financeApp = new Hono();
const service = new FinanceService();

financeApp.get('/summary', async (c) => {
  const period = parsePeriodFromQuery(c.req.query());
  const summary = await service.getSummary(period);
  return c.json({ success: true, data: summary });
});

export default financeApp;
