/**
 * Provision or update an ERP profile linked to an existing Supabase Auth user.
 *
 * Super admin bootstrap (production):
 *
 *   SUPER_ADMIN_ID=<auth.users.id> \
 *   SUPER_ADMIN_EMAIL=admin@kprints.com \
 *   SUPER_ADMIN_NAME="Store Admin" \
 *   npm run seed:super-admin --prefix backend
 *
 * Test personas (local RBAC):
 *
 *   TEST_USER_ID=<auth.users.id> \
 *   TEST_USER_EMAIL=viewer@test.local \
 *   TEST_USER_NAME="Test Viewer" \
 *   TEST_USER_ROLE=VIEWER \
 *   npm run seed:user --prefix backend
 *
 * Roles: SUPER_ADMIN | ADMIN | MANAGER | STAFF | DESIGNER | PRODUCTION_OPERATOR | FINANCE | VIEWER
 */
import { PrismaClient, type AppRole } from '@prisma/client';
import { deriveInitials } from '../src/utils/user.js';

const prisma = new PrismaClient();

const VALID_ROLES: AppRole[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'STAFF',
  'DESIGNER',
  'PRODUCTION_OPERATOR',
  'FINANCE',
  'VIEWER',
];

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes'].includes(value.toLowerCase());
}

async function main() {
  const id = process.env.SUPER_ADMIN_ID || process.env.TEST_USER_ID;
  const email = process.env.SUPER_ADMIN_EMAIL || process.env.TEST_USER_EMAIL;
  const fullName =
    process.env.SUPER_ADMIN_NAME || process.env.TEST_USER_NAME || 'App User';
  const defaultRole: AppRole = process.env.SUPER_ADMIN_ID ? 'SUPER_ADMIN' : 'VIEWER';
  const role = (process.env.TEST_USER_ROLE || defaultRole) as AppRole;
  const isApproved = parseBool(process.env.TEST_USER_APPROVED, true);
  const isActive = parseBool(process.env.TEST_USER_ACTIVE, true);

  if (!id || !email) {
    throw new Error(
      'Missing required env vars. Usage:\n' +
        '  SUPER_ADMIN_ID=<auth.users.id> SUPER_ADMIN_EMAIL=<email> npm run seed:super-admin --prefix backend\n' +
        '  TEST_USER_ID=<auth.users.id> TEST_USER_EMAIL=<email> [TEST_USER_ROLE=VIEWER] npm run seed:user --prefix backend'
    );
  }

  if (!VALID_ROLES.includes(role)) {
    throw new Error(`Invalid role "${role}". Must be one of: ${VALID_ROLES.join(', ')}`);
  }

  const initials = deriveInitials(fullName);

  const user = await prisma.appUser.upsert({
    where: { id },
    update: { email, fullName, initials, role, isApproved, isActive },
    create: { id, email, fullName, initials, role, isApproved, isActive },
  });

  console.log('✅ User provisioned:');
  console.log(`   id:         ${user.id}`);
  console.log(`   email:      ${user.email}`);
  console.log(`   role:       ${user.role}`);
  console.log(`   isApproved: ${user.isApproved}`);
  console.log(`   isActive:   ${user.isActive}`);
}

main()
  .catch((err) => {
    console.error('❌ Failed to seed user:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
