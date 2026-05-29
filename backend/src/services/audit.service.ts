import { prisma } from '../lib/prisma.js';
import type { Prisma } from '@prisma/client';

export interface AuditLogInput {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Lightweight audit trail — single INSERT per action (no queue).
 */
export class AuditService {
  async log(input: AuditLogInput): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: input.userId ?? null,
          action: input.action,
          entity: input.entity,
          entityId: input.entityId ?? null,
          metadata: input.metadata,
        },
      });
    } catch (err) {
      console.error('Audit log failed:', err);
    }
  }
}

export const audit = new AuditService();
