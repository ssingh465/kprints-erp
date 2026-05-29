import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { UsersService } from './users.service.js';
import { inviteUserSchema } from './users.validator.js';
import { protect, requireWrite } from '../../middleware/protect.js';
import type { AuthVariables } from '../../types/auth.js';

const invitationsApp = new Hono<{ Variables: AuthVariables }>();
const service = new UsersService();

invitationsApp.get('/validate', async (c) => {
  const token = c.req.query('token') ?? '';

  if (!token) {
    return c.json({
      success: true,
      data: {
        valid: false,
        expired: false,
        message: 'Invitation token is required.',
      },
    });
  }

  const result = await service.validateInvitationToken(token);
  return c.json({ success: true, data: result });
});

const adminInvitations = new Hono<{ Variables: AuthVariables }>();
adminInvitations.use('*', ...protect('admin/users'));

adminInvitations.get('/', async (c) => {
  const invitations = await service.listInvitations();
  return c.json({ success: true, data: invitations });
});

adminInvitations.post(
  '/',
  requireWrite('admin/users'),
  zValidator('json', inviteUserSchema),
  async (c) => {
    const { email, role } = c.req.valid('json');
    const actor = c.get('appUser')!;

    try {
      const invitation = await service.createInvitation(email, role, actor.id);
      return c.json(
        { success: true, data: invitation, message: 'Invitation sent successfully' },
        201
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';

      if (message === 'USER_EXISTS') {
        return c.json(
          { success: false, error: 'Conflict', message: 'A user with this email already exists.' },
          409
        );
      }
      if (message === 'INVITE_PENDING') {
        return c.json(
          {
            success: false,
            error: 'Conflict',
            message: 'A pending invitation already exists for this email.',
          },
          409
        );
      }
      if (message.startsWith('SUPABASE_INVITE_FAILED:')) {
        return c.json(
          {
            success: false,
            error: 'InviteFailed',
            message: message.replace('SUPABASE_INVITE_FAILED:', ''),
          },
          502
        );
      }

      return c.json(
        { success: false, error: 'InternalError', message: 'Could not send invitation.' },
        500
      );
    }
  }
);

adminInvitations.post('/:id/resend', requireWrite('admin/users'), async (c) => {
  const id = c.req.param('id');
  const actor = c.get('appUser')!;

  try {
    const invitation = await service.resendInvitation(id, actor.id);
    return c.json({ success: true, data: invitation, message: 'Invitation resent successfully' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    if (message === 'ALREADY_ACCEPTED') {
      return c.json(
        { success: false, error: 'Conflict', message: 'This invitation has already been accepted.' },
        409
      );
    }
    if (message.startsWith('SUPABASE_INVITE_FAILED:')) {
      return c.json(
        {
          success: false,
          error: 'InviteFailed',
          message: message.replace('SUPABASE_INVITE_FAILED:', ''),
        },
        502
      );
    }

    return c.json({ success: false, error: 'NotFound', message: 'Invitation not found' }, 404);
  }
});

adminInvitations.delete('/:id', requireWrite('admin/users'), async (c) => {
  const id = c.req.param('id');
  const actor = c.get('appUser')!;

  try {
    await service.revokeInvitation(id, actor.id);
    return c.json({ success: true, message: 'Invitation revoked successfully' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    if (message === 'ALREADY_ACCEPTED') {
      return c.json(
        {
          success: false,
          error: 'Conflict',
          message: 'This invitation was already accepted. Deactivate the user instead.',
        },
        409
      );
    }
    if (message === 'USER_ALREADY_ONBOARDED') {
      return c.json(
        {
          success: false,
          error: 'Conflict',
          message: 'This user already has an ERP profile. Deactivate the user instead.',
        },
        409
      );
    }
    if (message.startsWith('SUPABASE_DELETE_FAILED:')) {
      return c.json(
        {
          success: false,
          error: 'AuthDeleteFailed',
          message: message.replace('SUPABASE_DELETE_FAILED:', ''),
        },
        502
      );
    }

    return c.json({ success: false, error: 'NotFound', message: 'Invitation not found' }, 404);
  }
});

invitationsApp.route('/', adminInvitations);

export default invitationsApp;
