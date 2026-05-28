import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { parsePeriodFromQuery, serializePeriod } from '../../utils/period.js';
import { PartnersService } from './partners.service.js';

const partnersApp = new Hono();
const service = new PartnersService();

const partnerSchema = z.object({
  name: z.string().min(2, 'Partner name must be at least 2 characters'),
  profitSharePercent: z
    .number()
    .min(0, 'Profit share must be at least 0%')
    .max(100, 'Profit share cannot exceed 100%'),
});

const partnerUpdateSchema = partnerSchema.partial();

const investmentSchema = z.object({
  amount: z.number().positive('Investment amount must be greater than 0'),
  date: z.string().min(1, 'Investment date is required'),
  notes: z.string().optional(),
});

const investmentUpdateSchema = investmentSchema.partial();

partnersApp.get('/distribution', async (c) => {
  const period = parsePeriodFromQuery(c.req.query());
  const distribution = await service.getDistribution(period);
  return c.json({ success: true, data: distribution });
});

partnersApp.get('/', async (c) => {
  const periodQuery = c.req.query('period');
  const period = periodQuery ? parsePeriodFromQuery(c.req.query()) : undefined;
  const partners = await service.list(period);

  if (period) {
    return c.json({
      success: true,
      data: {
        items: partners,
        period: serializePeriod(period),
      },
    });
  }

  return c.json({ success: true, data: partners });
});

partnersApp.get('/:id', async (c) => {
  const partner = await service.getById(c.req.param('id'));
  if (!partner) {
    return c.json({ success: false, error: 'NotFound', message: 'Partner not found' }, 404);
  }
  return c.json({ success: true, data: partner });
});

partnersApp.post('/', zValidator('json', partnerSchema), async (c) => {
  const body = c.req.valid('json');
  try {
    const partner = await service.create(body);
    return c.json({ success: true, data: partner, message: 'Partner created successfully' }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: 'PartnerCreateError', message: error.message }, 400);
  }
});

partnersApp.put('/:id', zValidator('json', partnerUpdateSchema), async (c) => {
  const body = c.req.valid('json');
  try {
    const partner = await service.update(c.req.param('id'), body);
    return c.json({ success: true, data: partner, message: 'Partner updated successfully' });
  } catch (error: any) {
    const status = error.message === 'Partner not found' ? 404 : 400;
    return c.json({ success: false, error: 'PartnerUpdateError', message: error.message }, status);
  }
});

partnersApp.delete('/:id', async (c) => {
  try {
    await service.delete(c.req.param('id'));
    return c.json({ success: true, message: 'Partner deleted successfully' });
  } catch (error: any) {
    return c.json({ success: false, error: 'PartnerDeleteError', message: error.message }, 400);
  }
});

partnersApp.post('/:id/investments', zValidator('json', investmentSchema), async (c) => {
  const body = c.req.valid('json');
  try {
    const investment = await service.addInvestment(c.req.param('id'), body);
    return c.json({ success: true, data: investment, message: 'Investment recorded successfully' }, 201);
  } catch (error: any) {
    const status = error.message === 'Partner not found' ? 404 : 400;
    return c.json({ success: false, error: 'InvestmentCreateError', message: error.message }, status);
  }
});

partnersApp.put(
  '/:id/investments/:investmentId',
  zValidator('json', investmentUpdateSchema),
  async (c) => {
    const body = c.req.valid('json');
    try {
      const investment = await service.updateInvestment(
        c.req.param('id'),
        c.req.param('investmentId'),
        body
      );
      return c.json({ success: true, data: investment, message: 'Investment updated successfully' });
    } catch (error: any) {
      const status = error.message === 'Investment not found' ? 404 : 400;
      return c.json({ success: false, error: 'InvestmentUpdateError', message: error.message }, status);
    }
  }
);

partnersApp.delete('/:id/investments/:investmentId', async (c) => {
  try {
    await service.deleteInvestment(c.req.param('id'), c.req.param('investmentId'));
    return c.json({ success: true, message: 'Investment deleted successfully' });
  } catch (error: any) {
    const status = error.message === 'Investment not found' ? 404 : 400;
    return c.json({ success: false, error: 'InvestmentDeleteError', message: error.message }, status);
  }
});

export default partnersApp;
