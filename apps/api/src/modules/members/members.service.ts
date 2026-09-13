import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { MembershipRole, TenantStatus } from '@prisma/client';
import type {
  AcceptInvitationInput,
  Invitation,
  InvitationPreview,
  InviteMemberInput,
  Member,
  TransferOwnershipInput,
  UpdateMemberRoleInput,
} from '@yallego/contracts';

import { AuthService } from '../auth/auth.service';
import type { RequestMetadata, SessionResult } from '../auth/auth.types';
import { PasswordService } from '../auth/password.service';
import { TokenService } from '../auth/token.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { MailerService } from '../../infrastructure/mailer/mailer.service';
import { ApiHttpException } from '../../shared/errors/api-http.exception';
import type { TenantContext } from '../../shared/guards/tenant.guard';
import { PlanLimitsService } from '../plans/plan-limits.service';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1_000;

@Injectable()
export class MembersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MailerService) private readonly mailer: MailerService,
    @Inject(TokenService) private readonly tokenService: TokenService,
    @Inject(PasswordService) private readonly passwordService: PasswordService,
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(PlanLimitsService) private readonly planLimits: PlanLimitsService,
  ) {}

  async listMembers(tenant: TenantContext, currentUserId: string): Promise<Member[]> {
    const memberships = await this.prisma.withTenant(tenant.id, (tx) =>
      tx.membership.findMany({
        where: { tenantId: tenant.id },
        include: { user: true },
        orderBy: { joinedAt: 'asc' },
      }),
    );

    return memberships.map((membership) => ({
      id: membership.id,
      user_id: membership.userId,
      email: membership.user.email,
      full_name: membership.user.fullName,
      role: membership.role,
      joined_at: membership.joinedAt.toISOString(),
      last_login_at: membership.user.lastLoginAt?.toISOString() ?? null,
      is_current_user: membership.userId === currentUserId,
    }));
  }

  async inviteMember(
    tenant: TenantContext,
    actorUserId: string,
    input: InviteMemberInput,
  ): Promise<Invitation> {
    await this.assertWithinUserLimit(tenant.id);

    const rawToken = this.tokenService.createOpaqueToken('iv');
    const tokenHash = this.tokenService.hashOpaqueToken(rawToken);
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

    const invitation = await this.prisma.withTenant(tenant.id, async (tx) => {
      const existingMember = await tx.membership.findFirst({
        where: { tenantId: tenant.id, user: { email: input.email } },
      });
      if (existingMember) {
        throw new ApiHttpException(
          HttpStatus.CONFLICT,
          'DUPLICATE_RESOURCE',
          'Esta persona ya pertenece al negocio.',
        );
      }

      const pending = await tx.invitation.findFirst({
        where: { tenantId: tenant.id, email: input.email, acceptedAt: null, revokedAt: null },
      });
      if (pending && pending.expiresAt > new Date()) {
        throw new ApiHttpException(
          HttpStatus.CONFLICT,
          'DUPLICATE_RESOURCE',
          'Ya existe una invitación pendiente para este correo.',
        );
      }
      if (pending) {
        await tx.invitation.update({ where: { id: pending.id }, data: { revokedAt: new Date() } });
      }

      const created = await tx.invitation.create({
        data: {
          tenantId: tenant.id,
          email: input.email,
          role: input.role,
          tokenHash,
          invitedBy: actorUserId,
          expiresAt,
        },
      });

      await tx.auditEvent.create({
        data: {
          tenantId: tenant.id,
          action: 'members.invitation_sent',
          actorType: 'USER',
          actorUserId,
          resourceType: 'invitation',
          resourceId: created.id,
          metadata: { email: input.email, role: input.role },
        },
      });

      return created;
    });

    const inviter = await this.prisma.withTenant(tenant.id, (tx) =>
      tx.user.findUnique({ where: { id: actorUserId } }),
    );

    await this.mailer.sendInvitationEmail({
      email: invitation.email,
      businessName: tenant.businessName,
      inviterName: inviter?.fullName ?? tenant.businessName,
      token: rawToken,
    });

    return mapInvitation(invitation);
  }

  async listInvitations(tenant: TenantContext): Promise<Invitation[]> {
    const invitations = await this.prisma.withTenant(tenant.id, (tx) =>
      tx.invitation.findMany({ where: { tenantId: tenant.id }, orderBy: { createdAt: 'desc' } }),
    );
    return invitations.map(mapInvitation);
  }

  async revokeInvitation(
    tenant: TenantContext,
    actorUserId: string,
    invitationId: string,
  ): Promise<void> {
    await this.prisma.withTenant(tenant.id, async (tx) => {
      const invitation = await tx.invitation.findUnique({ where: { id: invitationId } });
      if (!invitation || invitation.tenantId !== tenant.id) {
        throw new ApiHttpException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'La invitación no existe.');
      }
      if (invitation.acceptedAt || invitation.revokedAt) {
        throw new ApiHttpException(
          HttpStatus.CONFLICT,
          'CONFLICT',
          'La invitación ya no está pendiente.',
        );
      }

      await tx.invitation.update({ where: { id: invitationId }, data: { revokedAt: new Date() } });
      await tx.auditEvent.create({
        data: {
          tenantId: tenant.id,
          action: 'members.invitation_revoked',
          actorType: 'USER',
          actorUserId,
          resourceType: 'invitation',
          resourceId: invitationId,
        },
      });
    });
  }

  async updateMemberRole(
    tenant: TenantContext,
    actorMembershipId: string,
    memberId: string,
    input: UpdateMemberRoleInput,
  ): Promise<Member> {
    if (memberId === actorMembershipId) {
      throw new ApiHttpException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'No puedes cambiar tu propio rol.',
      );
    }

    return this.prisma.withTenant(tenant.id, async (tx) => {
      const membership = await tx.membership.findUnique({
        where: { id: memberId },
        include: { user: true },
      });
      if (!membership || membership.tenantId !== tenant.id) {
        throw new ApiHttpException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'El miembro no existe.');
      }
      if (membership.role === MembershipRole.OWNER) {
        throw new ApiHttpException(
          HttpStatus.CONFLICT,
          'CONFLICT',
          'La propiedad se transfiere, no se reasigna como rol.',
        );
      }

      const updated = await tx.membership.update({
        where: { id: memberId },
        data: { role: input.role },
        include: { user: true },
      });

      await tx.auditEvent.create({
        data: {
          tenantId: tenant.id,
          action: 'members.role_changed',
          actorType: 'USER',
          resourceType: 'membership',
          resourceId: memberId,
          metadata: { from: membership.role, to: input.role },
        },
      });

      return {
        id: updated.id,
        user_id: updated.userId,
        email: updated.user.email,
        full_name: updated.user.fullName,
        role: updated.role,
        joined_at: updated.joinedAt.toISOString(),
        last_login_at: updated.user.lastLoginAt?.toISOString() ?? null,
        is_current_user: false,
      };
    });
  }

  async removeMember(tenant: TenantContext, actorUserId: string, memberId: string): Promise<void> {
    await this.prisma.withTenant(tenant.id, async (tx) => {
      const membership = await tx.membership.findUnique({ where: { id: memberId } });
      if (!membership || membership.tenantId !== tenant.id) {
        throw new ApiHttpException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'El miembro no existe.');
      }
      if (membership.role === MembershipRole.OWNER) {
        throw new ApiHttpException(
          HttpStatus.FORBIDDEN,
          'FORBIDDEN',
          'El propietario no puede ser removido.',
        );
      }

      await tx.membership.delete({ where: { id: memberId } });
      await tx.auditEvent.create({
        data: {
          tenantId: tenant.id,
          action: 'members.removed',
          actorType: 'USER',
          actorUserId,
          resourceType: 'membership',
          resourceId: memberId,
        },
      });
    });
  }

  async transferOwnership(
    tenant: TenantContext,
    actorMembershipId: string,
    input: TransferOwnershipInput,
  ): Promise<void> {
    if (input.member_id === actorMembershipId) {
      throw new ApiHttpException(
        HttpStatus.CONFLICT,
        'CONFLICT',
        'Ya eres el propietario de este negocio.',
      );
    }

    await this.prisma.withTenant(tenant.id, async (tx) => {
      const [current, target] = await Promise.all([
        tx.membership.findUnique({ where: { id: actorMembershipId } }),
        tx.membership.findUnique({ where: { id: input.member_id } }),
      ]);

      if (!current || current.tenantId !== tenant.id || current.role !== MembershipRole.OWNER) {
        throw new ApiHttpException(
          HttpStatus.FORBIDDEN,
          'FORBIDDEN',
          'Solo el propietario puede transferir la propiedad.',
        );
      }
      if (!target || target.tenantId !== tenant.id) {
        throw new ApiHttpException(
          HttpStatus.NOT_FOUND,
          'NOT_FOUND',
          'El miembro destino no existe.',
        );
      }

      // El disparador de base de datos exige exactamente un OWNER al finalizar
      // la transacción; ambas actualizaciones se confirman juntas.
      await tx.membership.update({
        where: { id: current.id },
        data: { role: MembershipRole.ADMIN },
      });
      await tx.membership.update({
        where: { id: target.id },
        data: { role: MembershipRole.OWNER },
      });

      await tx.auditEvent.create({
        data: {
          tenantId: tenant.id,
          action: 'members.ownership_transferred',
          actorType: 'USER',
          actorUserId: current.userId,
          resourceType: 'membership',
          resourceId: target.id,
          metadata: { previous_owner_membership_id: current.id },
        },
      });
    });
  }

  async previewInvitation(token: string): Promise<InvitationPreview> {
    const invitation = await this.findValidInvitation(token);
    const existingUser = await this.prisma.withoutTenantScope((tx) =>
      tx.user.findUnique({ where: { email: invitation.email }, select: { id: true } }),
    );

    return {
      email: invitation.email,
      role: invitation.role,
      business_name: invitation.tenant.businessName,
      expires_at: invitation.expiresAt.toISOString(),
      requires_registration: !existingUser,
    };
  }

  async acceptInvitation(
    input: AcceptInvitationInput,
    metadata: RequestMetadata,
  ): Promise<SessionResult> {
    const invitation = await this.findValidInvitation(input.token);
    await this.assertWithinUserLimit(invitation.tenantId);

    const userId = await this.prisma.withoutTenantScope(async (tx) => {
      const existingUser = await tx.user.findUnique({ where: { email: invitation.email } });

      const user =
        existingUser ??
        (await (async () => {
          if (!input.full_name || !input.password) {
            throw new ApiHttpException(
              HttpStatus.BAD_REQUEST,
              'VALIDATION_ERROR',
              'Indica tu nombre y una contraseña para crear tu cuenta.',
            );
          }
          this.passwordService.assertAllowed(input.password);
          const passwordHash = await this.passwordService.hash(input.password);
          return tx.user.create({
            data: {
              email: invitation.email,
              fullName: input.full_name,
              passwordHash,
              // La invitación llegó a esta dirección y el token solo es legible
              // desde el correo, lo que constituye prueba suficiente de control.
              emailVerified: true,
            },
          });
        })());

      const alreadyMember = await tx.membership.findUnique({
        where: { tenantId_userId: { tenantId: invitation.tenantId, userId: user.id } },
      });
      if (alreadyMember) {
        throw new ApiHttpException(
          HttpStatus.CONFLICT,
          'DUPLICATE_RESOURCE',
          'Ya perteneces a este negocio.',
        );
      }

      const consumed = await tx.invitation.updateMany({
        where: { id: invitation.id, acceptedAt: null, revokedAt: null },
        data: { acceptedAt: new Date() },
      });
      if (consumed.count !== 1) {
        throw new ApiHttpException(
          HttpStatus.CONFLICT,
          'CONFLICT',
          'La invitación ya no está disponible.',
        );
      }

      await tx.membership.create({
        data: { tenantId: invitation.tenantId, userId: user.id, role: invitation.role },
      });
      await tx.auditEvent.create({
        data: {
          tenantId: invitation.tenantId,
          action: 'members.invitation_accepted',
          actorType: 'USER',
          actorUserId: user.id,
          resourceType: 'invitation',
          resourceId: invitation.id,
        },
      });

      return user.id;
    });

    const user = await this.prisma.withoutTenantScope((tx) =>
      tx.user.findUnique({
        where: { id: userId },
        include: {
          memberships: {
            include: { tenant: true },
            orderBy: { joinedAt: 'asc' },
            where: { tenant: { status: TenantStatus.ACTIVE } },
          },
        },
      }),
    );
    if (!user) {
      throw new ApiHttpException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'INTERNAL_ERROR',
        'No se pudo completar el ingreso.',
      );
    }

    return this.authService.startSession(user, metadata);
  }

  private async findValidInvitation(token: string) {
    const tokenHash = this.tokenService.hashOpaqueToken(token);
    const invitation = await this.prisma.withoutTenantScope((tx) =>
      tx.invitation.findUnique({ where: { tokenHash }, include: { tenant: true } }),
    );

    if (
      !invitation ||
      invitation.revokedAt ||
      invitation.acceptedAt ||
      invitation.expiresAt <= new Date() ||
      invitation.tenant.status !== TenantStatus.ACTIVE
    ) {
      throw new ApiHttpException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'La invitación no es válida o ya expiró.',
      );
    }

    return invitation;
  }

  private async assertWithinUserLimit(tenantId: string): Promise<void> {
    const membersCount = await this.prisma.withoutTenantScope((tx) =>
      tx.membership.count({ where: { tenantId } }),
    );
    await this.planLimits.assertWithinLimit(
      tenantId,
      'users',
      membersCount,
      'Se alcanzó el límite de usuarios del plan actual.',
    );
  }
}

function mapInvitation(invitation: {
  id: string;
  email: string;
  role: MembershipRole;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
  invitedBy: string | null;
}): Invitation {
  const status = invitation.acceptedAt
    ? 'ACCEPTED'
    : invitation.revokedAt
      ? 'REVOKED'
      : invitation.expiresAt <= new Date()
        ? 'EXPIRED'
        : 'PENDING';

  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    status,
    expires_at: invitation.expiresAt.toISOString(),
    created_at: invitation.createdAt.toISOString(),
    invited_by: invitation.invitedBy,
  };
}
