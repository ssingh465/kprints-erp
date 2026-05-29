import { Hono } from 'hono';
import { supabaseAdmin } from '../../lib/supabase-admin.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, type AuthContext } from '../../middleware/auth.js';
import { deriveInitials, extractFullNameFromMetadata, isValidProperName } from '../../utils/user.js';
import { UsersService } from '../users/users.service.js';
import { audit } from '../../services/audit.service.js';
import type { AuthVariables } from '../../types/auth.js';

const authApp = new Hono<{ Variables: AuthVariables }>();
const usersService = new UsersService();

/**
 * GET /api/auth/me — current ERP profile for the authenticated user.
 */
authApp.get('/me', requireAuth, (c: AuthContext) => {
  const appUser = c.get('appUser');
  return c.json({ success: true, data: appUser });
});

/**
 * POST /api/auth/sync-profile — ensure an app_users row exists for the
 * authenticated Supabase user. Links to a pending invitation when present.
 */
authApp.post('/sync-profile', async (c: AuthContext) => {
  const header = c.req.header('authorization') || c.req.header('Authorization');
  const token = header?.toLowerCase().startsWith('bearer ')
    ? header.slice(7).trim()
    : null;

  if (!token) {
    return c.json(
      { success: false, error: 'Unauthorized', message: 'Authentication required.' },
      401
    );
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return c.json(
      { success: false, error: 'Unauthorized', message: 'Invalid or expired session.' },
      401
    );
  }

  const authUser = data.user;
  const email = authUser.email ?? '';

  const existing = await prisma.appUser.findUnique({ where: { id: authUser.id } });
  const metadata = (authUser.user_metadata ?? {}) as Record<string, unknown>;
  const fullName = extractFullNameFromMetadata(metadata, email);

  if (existing) {
    const metaName =
      (metadata.full_name as string) ||
      (metadata.display_name as string) ||
      (metadata.name as string);

    if (metaName?.trim() && isValidProperName(fullName) && fullName !== existing.fullName) {
      const updated = await prisma.appUser.update({
        where: { id: authUser.id },
        data: { fullName, initials: deriveInitials(fullName) },
      });
      return c.json({ success: true, data: updated });
    }

    return c.json({ success: true, data: existing });
  }

  const invitation = await usersService.findPendingInvitationByEmail(email);
  if (!invitation) {
    return c.json(
      {
        success: false,
        error: 'NoInvitation',
        message: 'No valid invitation found. Contact your administrator for access.',
      },
      403
    );
  }

  if (!isValidProperName(fullName)) {
    return c.json(
      {
        success: false,
        error: 'InvalidName',
        message:
          'A valid full name is required (letters only, each word capitalized, e.g. Jane Doe).',
      },
      400
    );
  }

  const created = await prisma.appUser.create({
    data: {
      id: authUser.id,
      email,
      fullName,
      initials: deriveInitials(fullName),
      role: invitation.role,
      isApproved: false,
      isActive: true,
      avatarUrl: (metadata.avatar_url as string) || null,
    },
  });

  await usersService.acceptInvitation(invitation.id);

  await audit.log({
    userId: created.id,
    action: 'login',
    entity: 'user',
    entityId: created.id,
    metadata: { email, source: 'sync-profile' },
  });

  return c.json({ success: true, data: created }, 201);
});

export default authApp;
