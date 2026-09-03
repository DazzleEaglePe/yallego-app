'use client';

import { can, type AssignableRole, type Invitation, type Member } from '@yallego/contracts';
import { useState } from 'react';

import { getActiveTenant, useAuthSession } from '@/features/auth/auth-session';
import { ApiRequestError } from '@/features/auth/api';
import { DashboardIcon } from '@/features/dashboard/dashboard-icon';
import { ConfirmTeamActionDialog } from '@/features/team/components/ConfirmTeamActionDialog';
import { InviteMemberDialog } from '@/features/team/components/InviteMemberDialog';
import { RoleBadge } from '@/features/team/components/RoleBadge';
import { TransferOwnershipDialog } from '@/features/team/components/TransferOwnershipDialog';
import { useTeamActions } from '@/features/team/hooks/use-team-actions';
import { useTeamInvitations, useTeamMembers } from '@/features/team/hooks/use-team';

const invitationStatus = {
  ACCEPTED: 'Aceptada',
  EXPIRED: 'Vencida',
  PENDING: 'Pendiente',
  REVOKED: 'Revocada',
} satisfies Record<Invitation['status'], string>;

type PendingAction =
  { id: string; kind: 'remove'; label: string } | { id: string; kind: 'revoke'; label: string };

export default function TeamPage() {
  const { session } = useAuthSession();
  const role = getActiveTenant(session)?.role ?? 'VIEWER';
  const canManageMembers = can(role, 'members:manage');
  const canAssignRoles = can(role, 'members:assign-role');
  const members = useTeamMembers();
  const invitations = useTeamInvitations(canManageMembers);
  const actions = useTeamActions();
  const [isInviteOpen, setInviteOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [transferTarget, setTransferTarget] = useState<Member | null>(null);

  const memberList = members.data ?? [];
  const invitationList = invitations.data ?? [];
  const pendingInvitations = invitationList.filter((invitation) => invitation.status === 'PENDING');
  const actionError = firstError(
    actions.updateRole.error,
    actions.remove.error,
    actions.revoke.error,
    actions.transfer.error,
  );

  function confirmPendingAction() {
    if (!pendingAction) return;

    if (pendingAction.kind === 'remove') {
      actions.remove.mutate(pendingAction.id, { onSuccess: () => setPendingAction(null) });
      return;
    }

    actions.revoke.mutate(pendingAction.id, { onSuccess: () => setPendingAction(null) });
  }

  return (
    <div className="pb-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <DashboardIcon className="h-5 w-5 text-brand-500" name="team" />
            <h1 className="text-3xl font-bold tracking-[-0.035em] text-neutral-950 sm:text-4xl">
              Equipo
            </h1>
          </div>
          <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500 sm:text-base">
            Revisa quién tiene acceso al negocio y qué nivel de permiso posee.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-5 text-sm text-neutral-500">
            <span>
              <strong className="text-neutral-950">{memberList.length}</strong> integrantes
            </span>
            {canManageMembers && (
              <span>
                <strong className="text-neutral-950">{pendingInvitations.length}</strong>{' '}
                invitaciones
              </span>
            )}
          </div>
          {canManageMembers && (
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100"
              onClick={() => {
                actions.invite.reset();
                setInviteOpen(true);
              }}
              type="button"
            >
              <DashboardIcon className="h-4 w-4" name="team" />
              Invitar persona
            </button>
          )}
        </div>
      </section>

      {actionError && (
        <p
          className="mt-5 rounded-xl border border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-600"
          role="alert"
        >
          {actionError}
        </p>
      )}

      <section className="mt-7 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-200 px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-neutral-950">Integrantes</h2>
          <p className="mt-1 text-sm text-neutral-500">Personas con acceso vigente al panel.</p>
        </div>

        {members.isLoading && <TeamSkeleton />}

        {members.isError && (
          <LoadError
            message="No pudimos cargar los integrantes."
            onRetry={() => void members.refetch()}
          />
        )}

        {!members.isLoading && !members.isError && memberList.length === 0 && (
          <div className="px-6 py-12 text-center text-sm text-neutral-500">
            No encontramos integrantes para este negocio.
          </div>
        )}

        {!members.isLoading && !members.isError && memberList.length > 0 && (
          <div className="divide-y divide-neutral-100">
            {memberList.map((member) => (
              <MemberRow
                canAssignRole={canAssignRoles && !member.is_current_user && member.role !== 'OWNER'}
                canRemove={canManageMembers && !member.is_current_user && member.role !== 'OWNER'}
                canTransfer={role === 'OWNER' && !member.is_current_user && member.role !== 'OWNER'}
                isBusy={
                  actions.updateRole.isPending ||
                  actions.remove.isPending ||
                  actions.transfer.isPending
                }
                key={member.id}
                member={member}
                onRemove={() =>
                  setPendingAction({ id: member.id, kind: 'remove', label: member.full_name })
                }
                onRoleChange={(nextRole) =>
                  actions.updateRole.mutate({ memberId: member.id, input: { role: nextRole } })
                }
                onTransfer={() => {
                  actions.transfer.reset();
                  setTransferTarget(member);
                }}
              />
            ))}
          </div>
        )}
      </section>

      {canManageMembers && (
        <section className="mt-5 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-200 px-5 py-4 sm:px-6">
            <h2 className="text-base font-semibold text-neutral-950">Invitaciones</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Accesos enviados que todavía pueden estar pendientes.
            </p>
          </div>

          {invitations.isLoading && <TeamSkeleton rows={2} />}

          {invitations.isError && (
            <LoadError
              message="No pudimos cargar las invitaciones."
              onRetry={() => void invitations.refetch()}
            />
          )}

          {!invitations.isLoading && !invitations.isError && invitationList.length === 0 && (
            <div className="px-6 py-10 text-center text-sm text-neutral-500">
              Aún no se enviaron invitaciones.
            </div>
          )}

          {!invitations.isLoading && !invitations.isError && invitationList.length > 0 && (
            <div className="divide-y divide-neutral-100">
              {invitationList.map((invitation) => (
                <InvitationRow
                  canRevoke={invitation.status === 'PENDING'}
                  invitation={invitation}
                  isBusy={actions.revoke.isPending}
                  key={invitation.id}
                  onRevoke={() =>
                    setPendingAction({
                      id: invitation.id,
                      kind: 'revoke',
                      label: invitation.email,
                    })
                  }
                />
              ))}
            </div>
          )}
        </section>
      )}

      {isInviteOpen && (
        <InviteMemberDialog
          error={errorMessage(actions.invite.error)}
          isPending={actions.invite.isPending}
          onClose={() => setInviteOpen(false)}
          onSubmit={(input) =>
            actions.invite.mutate(input, { onSuccess: () => setInviteOpen(false) })
          }
        />
      )}

      {pendingAction && (
        <ConfirmTeamActionDialog
          body={
            pendingAction.kind === 'remove'
              ? `${pendingAction.label} perderá el acceso a este negocio de inmediato.`
              : `La invitación enviada a ${pendingAction.label} dejará de ser válida.`
          }
          confirmLabel={pendingAction.kind === 'remove' ? 'Quitar acceso' : 'Revocar invitación'}
          isPending={actions.remove.isPending || actions.revoke.isPending}
          onCancel={() => setPendingAction(null)}
          onConfirm={confirmPendingAction}
          title={pendingAction.kind === 'remove' ? '¿Quitar integrante?' : '¿Revocar invitación?'}
        />
      )}

      {transferTarget && (
        <TransferOwnershipDialog
          error={errorMessage(actions.transfer.error)}
          isPending={actions.transfer.isPending}
          member={transferTarget}
          onCancel={() => setTransferTarget(null)}
          onConfirm={() =>
            actions.transfer.mutate(
              { member_id: transferTarget.id },
              { onSuccess: () => setTransferTarget(null) },
            )
          }
        />
      )}
    </div>
  );
}

function MemberRow({
  canAssignRole,
  canRemove,
  canTransfer,
  isBusy,
  member,
  onRemove,
  onRoleChange,
  onTransfer,
}: Readonly<{
  canAssignRole: boolean;
  canRemove: boolean;
  canTransfer: boolean;
  isBusy: boolean;
  member: Member;
  onRemove: () => void;
  onRoleChange: (role: AssignableRole) => void;
  onTransfer: () => void;
}>) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
        {initials(member.full_name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-neutral-950">
            {member.full_name}
          </span>
          {member.is_current_user && <span className="text-xs font-medium text-brand-600">Tú</span>}
        </span>
        <span className="block truncate text-sm text-neutral-500">{member.email}</span>
      </span>
      <span className="hidden text-right text-xs text-neutral-400 md:block">
        <span className="block">Último acceso</span>
        <span className="mt-0.5 block font-medium text-neutral-600">
          {member.last_login_at ? formatDate(member.last_login_at) : 'Sin registro'}
        </span>
      </span>
      {canAssignRole ? (
        <select
          aria-label={`Rol de ${member.full_name}`}
          className="rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-xs font-semibold text-neutral-600 outline-none transition hover:border-neutral-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-50"
          disabled={isBusy}
          onChange={(event) => onRoleChange(event.target.value as AssignableRole)}
          value={member.role}
        >
          <option value="ADMIN">Administrador</option>
          <option value="OPERATOR">Operador</option>
          <option value="VIEWER">Solo lectura</option>
        </select>
      ) : (
        <RoleBadge role={member.role} />
      )}
      {canRemove && (
        <button
          className="rounded-lg px-2.5 py-2 text-xs font-semibold text-danger-600 transition hover:bg-danger-50 disabled:opacity-50"
          disabled={isBusy}
          onClick={onRemove}
          type="button"
        >
          Quitar
        </button>
      )}
      {canTransfer && (
        <button
          className="rounded-lg px-2.5 py-2 text-xs font-semibold text-danger-600 transition hover:bg-danger-50 disabled:opacity-50"
          disabled={isBusy}
          onClick={onTransfer}
          type="button"
        >
          Transferir propiedad
        </button>
      )}
    </div>
  );
}

function InvitationRow({
  canRevoke,
  invitation,
  isBusy,
  onRevoke,
}: Readonly<{
  canRevoke: boolean;
  invitation: Invitation;
  isBusy: boolean;
  onRevoke: () => void;
}>) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-neutral-100 text-neutral-500">
        <DashboardIcon className="h-4.5 w-4.5" name="inbox" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-neutral-950">
          {invitation.email}
        </span>
        <span className="block text-xs text-neutral-500">
          Enviada el {formatDate(invitation.created_at)}
        </span>
      </span>
      <span
        className={
          invitation.status === 'PENDING'
            ? 'rounded-full bg-warning-50 px-2.5 py-1 text-xs font-semibold text-warning-600'
            : 'rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-500'
        }
      >
        {invitationStatus[invitation.status]}
      </span>
      <RoleBadge role={invitation.role} />
      {canRevoke && (
        <button
          className="rounded-lg px-2.5 py-2 text-xs font-semibold text-danger-600 transition hover:bg-danger-50 disabled:opacity-50"
          disabled={isBusy}
          onClick={onRevoke}
          type="button"
        >
          Revocar
        </button>
      )}
    </div>
  );
}

function LoadError({ message, onRetry }: Readonly<{ message: string; onRetry: () => void }>) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-6 sm:px-6">
      <p className="text-sm text-danger-600">{message}</p>
      <button
        className="text-sm font-semibold text-brand-600 transition hover:text-brand-700"
        onClick={onRetry}
        type="button"
      >
        Reintentar
      </button>
    </div>
  );
}

function TeamSkeleton({ rows = 3 }: Readonly<{ rows?: number }>) {
  return (
    <div className="divide-y divide-neutral-100" role="status">
      {Array.from({ length: rows }, (_, index) => (
        <div className="flex animate-pulse items-center gap-3 px-5 py-4 sm:px-6" key={index}>
          <span className="h-10 w-10 rounded-full bg-neutral-100" />
          <span className="flex-1 space-y-2">
            <span className="block h-3 w-40 rounded bg-neutral-100" />
            <span className="block h-3 w-56 max-w-full rounded bg-neutral-100" />
          </span>
          <span className="h-7 w-24 rounded-full bg-neutral-100" />
        </div>
      ))}
      <span className="sr-only">Cargando equipo…</span>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function errorMessage(error: unknown): string | undefined {
  if (!error) return undefined;
  if (error instanceof ApiRequestError) return error.message;
  return 'No pudimos completar la acción. Inténtalo nuevamente.';
}

function firstError(...errors: unknown[]): string | undefined {
  for (const error of errors) {
    const message = errorMessage(error);
    if (message) return message;
  }
  return undefined;
}
