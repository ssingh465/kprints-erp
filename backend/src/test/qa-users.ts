/**
 * Canonical QA persona definitions for RBAC testing.
 *
 * Emails follow ERP_Testing_Plan.md:
 *   qa-super-admin@<domain>, qa-admin@<domain>, … qa-viewer@<domain>
 *
 * Domain defaults to `example.com` and is overridden via QA_USER_DOMAIN in
 * backend/.env.test. Password is shared across personas via QA_USER_PASSWORD.
 */

import type { AppRole } from '@prisma/client';

export const QA_PERSONA_SLUGS = [
  'qa-super-admin',
  'qa-admin',
  'qa-manager',
  'qa-staff',
  'qa-designer',
  'qa-production',
  'qa-finance',
  'qa-viewer',
] as const;

export type QaPersonaSlug = (typeof QA_PERSONA_SLUGS)[number];

export interface QaPersonaDefinition {
  /** Stable Playwright fixture key — matches the email local-part. */
  slug: QaPersonaSlug;
  role: AppRole;
  /** Local-part before `@${QA_USER_DOMAIN}`. */
  emailLocal: string;
  fullName: string;
}

export const QA_PERSONAS: readonly QaPersonaDefinition[] = [
  {
    slug: 'qa-super-admin',
    role: 'SUPER_ADMIN',
    emailLocal: 'qa-super-admin',
    fullName: 'QA Super Admin',
  },
  {
    slug: 'qa-admin',
    role: 'ADMIN',
    emailLocal: 'qa-admin',
    fullName: 'QA Admin',
  },
  {
    slug: 'qa-manager',
    role: 'MANAGER',
    emailLocal: 'qa-manager',
    fullName: 'QA Manager',
  },
  {
    slug: 'qa-staff',
    role: 'STAFF',
    emailLocal: 'qa-staff',
    fullName: 'QA Staff',
  },
  {
    slug: 'qa-designer',
    role: 'DESIGNER',
    emailLocal: 'qa-designer',
    fullName: 'QA Designer',
  },
  {
    slug: 'qa-production',
    role: 'PRODUCTION_OPERATOR',
    emailLocal: 'qa-production',
    fullName: 'QA Production Operator',
  },
  {
    slug: 'qa-finance',
    role: 'FINANCE',
    emailLocal: 'qa-finance',
    fullName: 'QA Finance',
  },
  {
    slug: 'qa-viewer',
    role: 'VIEWER',
    emailLocal: 'qa-viewer',
    fullName: 'QA Viewer',
  },
] as const;

export const DEFAULT_QA_USER_DOMAIN = 'example.com';

export function normalizeQaUserDomain(raw: string | undefined): string {
  const domain = (raw ?? DEFAULT_QA_USER_DOMAIN).trim().toLowerCase();
  if (!domain || domain.includes('@')) {
    throw new Error(
      `Invalid QA_USER_DOMAIN "${raw ?? ''}". Expected a bare domain such as "example.com".`
    );
  }
  return domain;
}

export function buildQaEmail(emailLocal: string, domain: string): string {
  return `${emailLocal}@${domain}`.toLowerCase();
}

export function resolveQaPersonaEmail(
  persona: QaPersonaDefinition,
  domain: string
): string {
  return buildQaEmail(persona.emailLocal, domain);
}

export function getQaPersonaBySlug(slug: QaPersonaSlug): QaPersonaDefinition {
  const persona = QA_PERSONAS.find((entry) => entry.slug === slug);
  if (!persona) {
    throw new Error(`Unknown QA persona slug "${slug}".`);
  }
  return persona;
}

export interface ResolvedQaPersona extends QaPersonaDefinition {
  email: string;
}

export function resolveQaPersonas(env: NodeJS.ProcessEnv = process.env): ResolvedQaPersona[] {
  const domain = normalizeQaUserDomain(env.QA_USER_DOMAIN);
  return QA_PERSONAS.map((persona) => ({
    ...persona,
    email: resolveQaPersonaEmail(persona, domain),
  }));
}
