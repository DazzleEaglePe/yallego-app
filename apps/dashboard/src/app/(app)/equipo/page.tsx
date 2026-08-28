'use client';

import { can, type Invitation, type Member } from '@yallego/contracts';

import { useAuthSession } from '@/features/auth/auth-session';
import { DashboardIcon } from '@/features/dashboard/dashboard-icon';
import { RoleBadge } from '@/features/team/components/RoleBadge';
import { useTeamInvitations, useTeamMembers } from '@/features/team/hooks/use-team';

const invitationStatus = {
  ACCEPTED: 'Aceptada',
  EXPIRED: 'Vencida',
  PENDING: 'Pendiente',
  REVOKED: 'Revocada',
} satisfies Record<Invitation['status'], string>;

export default function TeamPage() {
  const { session } = useAuthSession();
  const role = session?.tenants[0]?.role ?? 'VIEWER';
  const canManageMembers = can(role, 'members:manage');
  const members = useTeamMembers();
  const invitations = useTeamInvitations(canManageMembers);

  const memberList = members.data ?? [];
  const invitationList = invitations.data ?? [];
  const pendingInvitations = invitationList.filter((invitation) => invitation.status === 'PENDING');

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

        <div className="flex items-center gap-5 text-sm text-neutral-500">
          <span>
            <strong className="text-neutral-950">{memberList.length}</strong> integrantes
          </span>
          {canManageMembers && (
            <span>
              <strong className="text-neutral-950">{pendingInvitations.length}</strong> invitaciones
            </span>
          )}
        </div>
      </section>

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
              <MemberRow key={member.id} member={member} />
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
                <InvitationRow invitation={invitation} key={invitation.id} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function MemberRow({ member }: Readonly<{ member: Member }>) {
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
      <RoleBadge role={member.role} />
    </div>
  );
}

function InvitationRow({ invitation }: Readonly<{ invitation: Invitation }>) {
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
