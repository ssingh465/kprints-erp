import type { Context, MiddlewareHandler } from 'hono';

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function clientKey(c: Context): string {
  const forwarded = c.req.header('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || c.req.header('x-real-ip') || 'local';
  return `${ip}:${c.req.path}`;
}

export function rateLimit(options: { windowMs: number; max: number }): MiddlewareHandler {
  const { windowMs, max } = options;

  return async (c, next) => {
    const key = clientKey(c);
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      await next();
      return;
    }

    if (bucket.count >= max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      c.header('Retry-After', String(retryAfter));
      return c.json(
        {
          success: false,
          error: 'TooManyRequests',
          message: `Rate limit exceeded. Retry after ${retryAfter}s.`,
        },
        429
      );
    }

    bucket.count += 1;
    await next();
  };
}
