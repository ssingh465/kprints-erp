import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { SetupService } from './setup.service.js';
import { protectSetupDemo, protectSetupMutation } from '../../middleware/protect.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import type { AuthVariables } from '../../types/auth.js';

const setupApp = new Hono<{ Variables: AuthVariables }>();
const service = new SetupService();

const setupMutationSchema = z.object({
  confirm: z.literal('RESET_PROD'),
});

const setupRateLimit = rateLimit({ windowMs: 60_000, max: 1 });

setupApp.get('/status', async (c) => {
  try {
    const data = await service.getStatus();
    return c.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Status check failed';
    return c.json({ success: false, error: 'StatusCheckError', message }, 500);
  }
});

setupApp.use('/demo', ...protectSetupDemo(), setupRateLimit);
setupApp.use('/fresh', ...protectSetupMutation(), setupRateLimit);

setupApp.post('/demo', zValidator('json', setupMutationSchema), async (c) => {
  try {
    const data = await service.initializeDemo();
    return c.json({
      success: true,
      data,
      message: 'Demo data successfully seeded. All dynamic tables populated and editable.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Demo init failed';
    return c.json({ success: false, error: 'DemoInitError', message }, 400);
  }
});

setupApp.post('/fresh', zValidator('json', setupMutationSchema), async (c) => {
  try {
    const data = await service.initializeFresh();
    return c.json({
      success: true,
      data,
      message: 'Fresh blank database successfully initialized. All transactional tables cleared.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Fresh init failed';
    return c.json({ success: false, error: 'FreshInitError', message }, 400);
  }
});

export default setupApp;
