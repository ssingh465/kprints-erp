import { randomUUID } from 'crypto';
import type { AppRole, AppUser, UserInvitation } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { supabaseAdmin } from '../../lib/supabase-admin.js';
import { config } from '../../config/index.js';
import { audit } from '../../services/audit.service.js';

const INVITE_EXPIRY_DAYS = 7;

export type UserStatus = 'pending' | 'active' | 'disabled';

export interface UserListItem {
  id: string;
  email: string;
  fullName: string | null;
  role: AppRole;
  status: UserStatus | 'invited';
  isApproved: boolean;
  isActive: boolean;
  createdAt: Date;
  type: 'user' | 'invitation';
  invitationId?: string;
}

export interface InvitationValidation {
  valid: boolean;
  expired: boolean;
  email?: string;
  role?: AppRole;
  message?: string;
}

export class UsersService {
  private inviteRedirectUrl(): string {
    return `${config.frontendUrl}/auth/accept-invite`;
  }

  async listUsers(options: {
    search?: string;
    role?: AppRole;
    status?: 'pending' | 'active' | 'disabled' | 'invited';
    skip?: number;
    take?: number;
  }): Promise<{ items: UserListItem[]; total: number }> {
    const { search = '', role, status, skip = 0, take = 50 } = options;

    const users = await prisma.appUser.findMany({
      where: {
        ...(search
          ? {
              OR: [
                { email: { contains: search, mode: 'insensitive' } },
                { fullName: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(role ? { role } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    const pendingInvites = await prisma.userInvitation.findMany({
      where: {
        acceptedAt: null,
        expiresAt: { gt: new Date() },
        ...(search ? { email: { contains: search, mode: 'insensitive' } } : {}),
        ...(role ? { role } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    const registeredEmails = new Set(users.map((u) => u.email.toLowerCase()));

    const userItems: UserListItem[] = users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      status: this.resolveUserStatus(u),
      isApproved: u.isApproved,
      isActive: u.isActive,
      createdAt: u.createdAt,
      type: 'user' as const,
    }));

    const inviteItems: UserListItem[] = pendingInvites
      .filter((inv) => !registeredEmails.has(inv.email.toLowerCase()))
      .map((inv) => ({
        id: inv.id,
        email: inv.email,
        fullName: null,
        role: inv.role,
        status: 'invited' as const,
        isApproved: false,
        isActive: true,
        createdAt: inv.createdAt,
        type: 'invitation' as const,
        invitationId: inv.id,
      }));

    let combined = [...userItems, ...inviteItems];

    if (status) {
      combined = combined.filter((item) => item.status === status);
    }

    combined.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = combined.length;
    const items = combined.slice(skip, skip + take);

    return { items, total };
  }

  async getById(id: string): Promise<AppUser | null> {
    return prisma.appUser.findUnique({ where: { id } });
  }

  async approve(userId: string, actorId: string): Promise<AppUser> {
    const user = await prisma.appUser.update({
      where: { id: userId },
      data: { isApproved: true },
    });

    await audit.log({
      userId: actorId,
      action: 'approve',
      entity: 'user',
      entityId: userId,
      metadata: { email: user.email },
    });

    return user;
  }

  async deactivate(userId: string, actorId: string): Promise<AppUser> {
    const user = await prisma.appUser.update({
      where: { id: userId },
      data: { isActive: false },
    });

    await audit.log({
      userId: actorId,
      action: 'deactivate',
      entity: 'user',
      entityId: userId,
      metadata: { email: user.email },
    });

    return user;
  }

  async updateRole(userId: string, role: AppRole, actorId: string): Promise<AppUser> {
    const existing = await prisma.appUser.findUniqueOrThrow({ where: { id: userId } });

    const user = await prisma.appUser.update({
      where: { id: userId },
      data: { role },
    });

    await audit.log({
      userId: actorId,
      action: 'role_change',
      entity: 'user',
      entityId: userId,
      metadata: { email: user.email, oldRole: existing.role, newRole: role },
    });

    return user;
  }

  async createInvitation(
    email: string,
    role: AppRole,
    invitedById: string
  ): Promise<UserInvitation> {
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await prisma.appUser.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      throw new Error('USER_EXISTS');
    }

    const pendingInvite = await prisma.userInvitation.findFirst({
      where: {
        email: normalizedEmail,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (pendingInvite) {
      throw new Error('INVITE_PENDING');
    }

    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

    const invitation = await prisma.userInvitation.create({
      data: {
        email: normalizedEmail,
        role,
        token,
        invitedById,
        expiresAt,
      },
    });

    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(normalizedEmail, {
      redirectTo: this.inviteRedirectUrl(),
      data: { role, invitation_token: token },
    });

    if (error) {
      await prisma.userInvitation.delete({ where: { id: invitation.id } });
      throw new Error(`SUPABASE_INVITE_FAILED:${error.message}`);
    }

    await audit.log({
      userId: invitedById,
      action: 'invite',
      entity: 'invitation',
      entityId: invitation.id,
      metadata: { email: normalizedEmail, role },
    });

    return invitation;
  }

  async listInvitations(): Promise<UserInvitation[]> {
    return prisma.userInvitation.findMany({
      where: { acceptedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { invitedBy: { select: { fullName: true, email: true } } },
    });
  }

  async resendInvitation(invitationId: string, actorId: string): Promise<UserInvitation> {
    const invitation = await prisma.userInvitation.findUniqueOrThrow({
      where: { id: invitationId },
    });

    if (invitation.acceptedAt) {
      throw new Error('ALREADY_ACCEPTED');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

    const updated = await prisma.userInvitation.update({
      where: { id: invitationId },
      data: { expiresAt },
    });

    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(invitation.email, {
      redirectTo: this.inviteRedirectUrl(),
      data: { role: invitation.role, invitation_token: invitation.token },
    });

    if (error) {
      throw new Error(`SUPABASE_INVITE_FAILED:${error.message}`);
    }

    await audit.log({
      userId: actorId,
      action: 'invite_resend',
      entity: 'invitation',
      entityId: invitationId,
      metadata: { email: invitation.email },
    });

    return updated;
  }

  async revokeInvitation(invitationId: string, actorId: string): Promise<void> {
    const invitation = await prisma.userInvitation.findUniqueOrThrow({
      where: { id: invitationId },
    });

    if (invitation.acceptedAt) {
      throw new Error('ALREADY_ACCEPTED');
    }

    const appUser = await prisma.appUser.findUnique({
      where: { email: invitation.email },
    });
    if (appUser) {
      throw new Error('USER_ALREADY_ONBOARDED');
    }

    const authUser = await this.findSupabaseAuthUserByEmail(invitation.email);
    if (authUser) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(authUser.id);
      if (error) {
        throw new Error(`SUPABASE_DELETE_FAILED:${error.message}`);
      }
    }

    await prisma.userInvitation.delete({ where: { id: invitationId } });

    await audit.log({
      userId: actorId,
      action: 'invite_revoke',
      entity: 'invitation',
      entityId: invitationId,
      metadata: {
        email: invitation.email,
        deletedAuthUserId: authUser?.id ?? null,
      },
    });
  }

  /** Look up a Supabase auth.users row by email (invite creates one before ERP signup). */
  private async findSupabaseAuthUserByEmail(email: string) {
    const normalized = email.trim().toLowerCase();
    let page = 1;
    const perPage = 200;

    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) {
        throw new Error(`SUPABASE_LIST_FAILED:${error.message}`);
      }

      const match = data.users.find((u) => u.email?.toLowerCase() === normalized);
      if (match) {
        return match;
      }

      if (data.users.length < perPage) {
        return null;
      }

      page++;
    }
  }

  async validateInvitationToken(token: string): Promise<InvitationValidation> {
    const invitation = await prisma.userInvitation.findUnique({ where: { token } });

    if (!invitation) {
      return {
        valid: false,
        expired: false,
        message: 'This invitation link is no longer valid.',
      };
    }

    if (invitation.acceptedAt) {
      return {
        valid: false,
        expired: true,
        email: invitation.email,
        role: invitation.role,
        message: 'This invitation has already been used.',
      };
    }

    if (invitation.expiresAt < new Date()) {
      return {
        valid: false,
        expired: true,
        email: invitation.email,
        role: invitation.role,
        message: 'This invitation has expired. Contact your administrator for a new invite.',
      };
    }

    return {
      valid: true,
      expired: false,
      email: invitation.email,
      role: invitation.role,
    };
  }

  async findPendingInvitationByEmail(email: string): Promise<UserInvitation | null> {
    return prisma.userInvitation.findFirst({
      where: {
        email: email.trim().toLowerCase(),
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async acceptInvitation(invitationId: string): Promise<void> {
    await prisma.userInvitation.update({
      where: { id: invitationId },
      data: { acceptedAt: new Date() },
    });
  }

  private resolveUserStatus(user: AppUser): UserStatus {
    if (!user.isActive) return 'disabled';
    if (!user.isApproved) return 'pending';
    return 'active';
  }
}
