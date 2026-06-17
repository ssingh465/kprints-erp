import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { PosterCategoriesService } from './poster-categories.service.js';
import { protect, requireWrite } from '../../middleware/protect.js';
import type { AuthVariables } from '../../types/auth.js';

const app = new Hono<{ Variables: AuthVariables }>();
const service = new PosterCategoriesService();

app.use('*', ...protect('catalog'));

const categorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters'),
});

app.get('/', async (c) => {
  const items = await service.list();
  return c.json({ success: true, data: items });
});

app.post('/', requireWrite('catalog'), zValidator('json', categorySchema), async (c) => {
  try {
    const body = c.req.valid('json');
    const category = await service.create(body.name);
    return c.json({ success: true, data: category, message: 'Category created' }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Create failed';
    return c.json({ success: false, error: 'CategoryCreateError', message }, 400);
  }
});

app.put('/:id', requireWrite('catalog'), zValidator('json', categorySchema), async (c) => {
  try {
    const body = c.req.valid('json');
    const category = await service.update(c.req.param('id'), body.name);
    return c.json({ success: true, data: category, message: 'Category updated' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Update failed';
    return c.json({ success: false, error: 'CategoryUpdateError', message }, 400);
  }
});

app.delete('/:id', requireWrite('catalog'), async (c) => {
  try {
    await service.delete(c.req.param('id'));
    return c.json({ success: true, message: 'Category deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Delete failed';
    return c.json({ success: false, error: 'CategoryDeleteError', message }, 400);
  }
});

export default app;
