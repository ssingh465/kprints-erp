import { prisma } from '../lib/prisma.js';

const TTL_MS = 24 * 60 * 60 * 1000;

export async function replayIdempotentResponse(
  key: string | undefined
): Promise<{ statusCode: number; body: unknown } | null> {
  if (!key?.trim()) return null;

  const existing = await prisma.requestIdempotency.findUnique({ where: { key: key.trim() } });
  if (!existing || existing.expiresAt <= new Date()) {
    return null;
  }

  return { statusCode: existing.statusCode, body: existing.responseBody };
}

export async function storeIdempotentResponse(
  key: string | undefined,
  method: string,
  path: string,
  statusCode: number,
  body: unknown
): Promise<void> {
  if (!key?.trim() || statusCode < 200 || statusCode >= 300) return;

  await prisma.requestIdempotency.upsert({
    where: { key: key.trim() },
    create: {
      key: key.trim(),
      method,
      path,
      statusCode,
      responseBody: body as object,
      expiresAt: new Date(Date.now() + TTL_MS),
    },
    update: {
      method,
      path,
      statusCode,
      responseBody: body as object,
      expiresAt: new Date(Date.now() + TTL_MS),
    },
  });
}
