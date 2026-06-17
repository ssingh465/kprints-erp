/**
 * Provision QA personas in the Supabase TEST project:
 *   1. Create or update Supabase Auth users (confirmed, shared password).
 *   2. Upsert matching `app_users` rows with the correct AppRole.
 *
 * Used by:
 *   - backend/scripts/seed-qa-users.ts (operator CLI)
 *   - backend/prisma/seed-qa-users.ts (npm script entry)
 *
 * Safety: refuses to run unless `assertTestEnvironment()` accepts the env.
 */

import { createClient, type User } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import { assertTestEnvironment } from './test-env-guard.js';
import {
  resolveQaPersonas,
  type ResolvedQaPersona,
} from './qa-users.js';
import { deriveInitials } from '../utils/user.js';

const PLACEHOLDER_PASSWORDS = new Set([
  '',
  'ChangeMe!QaTest123',
  'your-test-password',
  '[YOUR-PASSWORD]',
  'your-test-supabase-anon-key',
  'your-test-supabase-service-role-key',
]);

export interface QaUserSeedResult {
  persona: ResolvedQaPersona;
  authUserId: string;
  createdAuthUser: boolean;
  createdAppUser: boolean;
}

export interface SeedQaUsersOptions {
  env?: NodeJS.ProcessEnv;
  prisma?: PrismaClient;
}

function requireEnv(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required env var ${key}. Populate backend/.env.test first.`);
  }
  return value;
}

function assertQaPassword(password: string): void {
  if (PLACEHOLDER_PASSWORDS.has(password)) {
    throw new Error(
      'QA_USER_PASSWORD is blank or still set to the template placeholder. ' +
        'Edit backend/.env.test with a real TEST-only password before seeding QA users.'
    );
  }
  if (password.length < 12) {
    throw new Error(
      'QA_USER_PASSWORD must be at least 12 characters for Supabase Auth.'
    );
  }
}

function createSupabaseAdmin(env: NodeJS.ProcessEnv) {
  const supabaseUrl = requireEnv(env, 'SUPABASE_URL');
  const serviceKey =
    env.SUPABASE_SERVICE_ROLE_KEY?.trim() || env.SUPABASE_SERVICE_KEY?.trim();
  if (!serviceKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY. Populate backend/.env.test with the TEST project service role key.'
    );
  }

  for (const placeholder of [
    '[YOUR-TEST-PROJECT-REF]',
    'your-test-supabase-service-role-key',
  ]) {
    if (supabaseUrl.includes(placeholder) || serviceKey.includes(placeholder)) {
      throw new Error(
        `Supabase credentials still contain placeholder "${placeholder}". Edit backend/.env.test.`
      );
    }
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function findAuthUserByEmail(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  email: string
): Promise<User | null> {
  const normalized = email.toLowerCase();
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`SUPABASE_LIST_USERS_FAILED:${error.message}`);
    }

    const match = data.users.find(
      (user) => user.email?.toLowerCase() === normalized
    );
    if (match) {
      return match;
    }

    if (data.users.length < perPage) {
      return null;
    }
    page += 1;
  }
}

async function ensureAuthUser(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  persona: ResolvedQaPersona,
  password: string
): Promise<{ user: User; created: boolean }> {
  const metadata = {
    full_name: persona.fullName,
    name: persona.fullName,
    display_name: persona.fullName,
    role: persona.role,
  };

  const existing = await findAuthUserByEmail(supabase, persona.email);
  if (!existing) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: persona.email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) {
      throw new Error(
        `SUPABASE_CREATE_FAILED:${persona.email}:${error.message}`
      );
    }
    if (!data.user) {
      throw new Error(`SUPABASE_CREATE_FAILED:${persona.email}:missing user payload`);
    }
    return { user: data.user, created: true };
  }

  const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error) {
    throw new Error(
      `SUPABASE_UPDATE_FAILED:${persona.email}:${error.message}`
    );
  }
  if (!data.user) {
    throw new Error(`SUPABASE_UPDATE_FAILED:${persona.email}:missing user payload`);
  }
  return { user: data.user, created: false };
}

async function upsertAppUser(
  prisma: PrismaClient,
  persona: ResolvedQaPersona,
  authUserId: string
): Promise<boolean> {
  const initials = deriveInitials(persona.fullName);
  const existing = await prisma.appUser.findUnique({ where: { id: authUserId } });

  await prisma.appUser.upsert({
    where: { id: authUserId },
    update: {
      email: persona.email,
      fullName: persona.fullName,
      initials,
      role: persona.role,
      isApproved: true,
      isActive: true,
    },
    create: {
      id: authUserId,
      email: persona.email,
      fullName: persona.fullName,
      initials,
      role: persona.role,
      isApproved: true,
      isActive: true,
    },
  });

  return !existing;
}

/**
 * Create or refresh all eight QA personas in Supabase Auth + app_users.
 */
export async function seedQaUsers(
  options: SeedQaUsersOptions = {}
): Promise<QaUserSeedResult[]> {
  const env = options.env ?? process.env;
  assertTestEnvironment(env);

  const password = requireEnv(env, 'QA_USER_PASSWORD');
  assertQaPassword(password);

  const personas = resolveQaPersonas(env);
  const supabase = createSupabaseAdmin(env);
  const prisma = options.prisma ?? new PrismaClient();
  const ownsPrisma = !options.prisma;

  try {
    const results: QaUserSeedResult[] = [];

    for (const persona of personas) {
      const { user, created: createdAuthUser } = await ensureAuthUser(
        supabase,
        persona,
        password
      );
      const createdAppUser = await upsertAppUser(prisma, persona, user.id);

      results.push({
        persona,
        authUserId: user.id,
        createdAuthUser,
        createdAppUser,
      });
    }

    return results;
  } finally {
    if (ownsPrisma) {
      await prisma.$disconnect();
    }
  }
}
