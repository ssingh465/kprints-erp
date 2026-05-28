import { Hono } from 'hono';
import { SetupService } from './setup.service.js';

const setupApp = new Hono();
const service = new SetupService();

setupApp.get('/status', async (c) => {
  try {
    const data = await service.getStatus();
    return c.json({
      success: true,
      data
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: 'StatusCheckError',
      message: error.message
    }, 500);
  }
});

setupApp.post('/demo', async (c) => {
  try {
    const data = await service.initializeDemo();
    return c.json({
      success: true,
      data,
      message: 'Demo data successfully seeded. All dynamic tables populated and editable.'
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: 'DemoInitError',
      message: error.message
    }, 500);
  }
});

setupApp.post('/fresh', async (c) => {
  try {
    const data = await service.initializeFresh();
    return c.json({
      success: true,
      data,
      message: 'Fresh blank database successfully initialized. All transactional tables cleared.'
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: 'FreshInitError',
      message: error.message
    }, 500);
  }
});

export default setupApp;
