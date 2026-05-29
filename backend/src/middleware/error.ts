import { Context } from 'hono';

export async function errorHandler(err: Error, c: Context) {
  console.error('[Global Error Middleware]:', err);

  const status = c.res.status === 200 || c.res.status === 404 ? 500 : c.res.status;
  c.status(status as any);

  return c.json({
    success: false,
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred.'
  });
}

export async function notFoundHandler(c: Context) {
  c.status(404);
  return c.json({
    success: false,
    error: 'NotFound',
    message: `Resource not found: ${c.req.method} ${c.req.url}`
  });
}
