import { Hono } from 'hono';
import { parsePeriodFromQuery } from '../../utils/period.js';
import { FinanceService } from './finance.service.js';
import { protect } from '../../middleware/protect.js';
import type { AuthVariables } from '../../types/auth.js';

const financeApp = new Hono<{ Variables: AuthVariables }>();
const service = new FinanceService();

financeApp.use('*', ...protect('finance'));

financeApp.get('/summary', async (c) => {
  const period = parsePeriodFromQuery(c.req.query());
  const summary = await service.getSummary(period);
  return c.json({ success: true, data: summary });
});

export default financeApp;
