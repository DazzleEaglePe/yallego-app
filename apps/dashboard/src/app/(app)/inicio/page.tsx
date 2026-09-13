'use client';

import { can } from '@yallego/contracts';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Circle,
  Clock3,
  Laptop,
  Plus,
  Radio,
  RefreshCw,
  Smartphone,
  Wallet,
} from 'lucide-react';

import { getActiveTenant, useAuthSession } from '@/features/auth/auth-session';
import { PairDeviceDialog } from '@/features/devices/components/PairDeviceDialog';
import { useDevices } from '@/features/devices/hooks/use-devices';
import { fetchTransactions } from '@/features/transactions/api/transactions';
import { StatusBadge } from '@/features/transactions/components/StatusBadge';
import { useRealtimeTransactions } from '@/features/transactions/hooks/use-realtime-transactions';
import { useTransactionSummary } from '@/features/transactions/hooks/use-transaction-summary';
import { useWallets } from '@/features/wallets/hooks/use-wallets';
import { formatCurrency, formatElapsed } from '@/shared/lib/format';

const DAY_MS = 86_400_000;
function limaDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Lima',
    year: 'numeric',
  }).format(date);
}

export default function DashboardHomePage() {
  const router = useRouter();
  const { session } = useAuthSession();
  const tenant = getActiveTenant(session);
  const canManageDevices = tenant !== undefined && can(tenant.role, 'devices:manage');
  const canManageWallets = tenant !== undefined && can(tenant.role, 'wallets:manage');
  const [period, setPeriod] = useState(14);
  const [pairing, setPairing] = useState(false);
  const devices = useDevices();
  const { tenantWallets } = useWallets(canManageWallets);
  const summary = useTransactionSummary({
    from: `${limaDate(new Date(Date.now() - (period - 1) * DAY_MS))}T05:00:00.000Z`,
  });
  useRealtimeTransactions();
  const accessToken = session?.accessToken ?? null;
  const recent = useQuery({
    queryKey: ['transactions', 'recent'],
    queryFn: () => fetchTransactions(accessToken!, { limit: 5 }),
    enabled: Boolean(accessToken),
  });
  const deviceList = devices.data ?? [];
  const active = deviceList.filter((device) => device.status === 'ACTIVE');
  const online = active.filter((device) => device.connectivity === 'ONLINE');
  const walletEnabled = (tenantWallets.data ?? []).some((wallet) => wallet.is_enabled);
  const confirmed = summary.data?.confirmed_totals;
  const rows = recent.data?.data ?? [];
  const pendingReview =
    summary.data?.by_status?.find(({ status }) => status === 'DISPUTED')?.count ?? 0;
  const amounts = new Map(
    (summary.data?.confirmed_by_day ?? []).map((day) => [day.date, Number(day.amount)]),
  );
  const days = Array.from({ length: period }, (_, index) => {
    const date = new Date(Date.now() - (period - 1 - index) * DAY_MS);
    return {
      date: limaDate(date),
      label: new Intl.DateTimeFormat('es-PE', {
        day: 'numeric',
        month: 'short',
        timeZone: 'America/Lima',
      }).format(date),
      amount: amounts.get(limaDate(date)) ?? 0,
    };
  });
  const maximum = Math.max(...days.map((day) => day.amount), 0);
  const loaded = summary.isSuccess;
  const money = (amount: string | undefined) =>
    loaded ? formatCurrency(amount ?? '0', confirmed?.currency ?? 'PEN') : '—';
  const healthy = active.length > 0 && online.length === active.length;
  const monitorLabel = devices.isError
    ? 'Estado no disponible'
    : devices.isLoading
      ? 'Consultando estado'
      : healthy
        ? 'Todo en línea'
        : !deviceList.length
          ? 'Por configurar'
          : 'Requiere atención';
  const setup = [
    {
      label: 'Elige tu billetera',
      complete: walletEnabled,
      href: '/billeteras',
      allowed: canManageWallets,
    },
    {
      label: 'Conecta tu Android',
      complete: deviceList.length > 0,
      href: '/dispositivos',
      allowed: canManageDevices,
    },
    {
      label: 'Recibe tu primer cobro',
      complete: rows.length > 0,
      href: '/transacciones',
      allowed: true,
    },
  ];
  const visibleSetup = setup.filter((step) => step.allowed);
  const showSetup =
    canManageDevices &&
    !devices.isLoading &&
    !tenantWallets.isLoading &&
    !recent.isLoading &&
    !devices.isError &&
    !tenantWallets.isError &&
    !recent.isError &&
    visibleSetup.some((step) => !step.complete);

  return (
    <div className="overview">
      <section className="overview-heading" data-animate>
        <div>
          <p className="workspace-eyebrow">TU NEGOCIO, EN PERSPECTIVA</p>
          <h1>
            Cada cobro.
            <br />
            <span>Bajo control.</span>
          </h1>
          <p className="overview-description">
            Hola, {session?.user.full_name.trim().split(/\s+/)[0] ?? 'equipo'}. Este es el pulso de
            tu operación.
          </p>
        </div>
        <div className="overview-heading-side">
          <span className="overview-date">
            {new Intl.DateTimeFormat('es-PE', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              timeZone: 'America/Lima',
            }).format(new Date())}
          </span>
          {canManageDevices && (
            <button
              className="workspace-button primary"
              type="button"
              disabled={tenantWallets.isLoading || tenantWallets.isError}
              onClick={() => (walletEnabled ? setPairing(true) : router.push('/billeteras'))}
            >
              <Plus size={15} />
              {walletEnabled ? 'Conectar dispositivo' : 'Configurar billetera'}
            </button>
          )}
        </div>
      </section>
      <nav className="overview-tabs" aria-label="Vistas de operación">
        <span aria-current="page">
          Resumen <span className="tab-shortcut">01</span>
        </span>
        <Link href="/transacciones">
          Transacciones <ArrowUpRight size={13} />
        </Link>
        {canManageDevices && (
          <Link href="/dispositivos">
            Dispositivos <ArrowUpRight size={13} />
          </Link>
        )}
      </nav>
      {showSetup && (
        <section className="overview-setup" aria-label="Primeros pasos" data-animate>
          <div>
            <span className="setup-orbit">
              <Wallet size={18} />
            </span>
            <span>
              <strong>Tu operación empieza aquí</strong>
              <small>
                {visibleSetup.filter((step) => step.complete).length} de {visibleSetup.length} pasos
                completados
              </small>
            </span>
          </div>
          <ol>
            {visibleSetup.map((step, index) => (
              <li key={step.label}>
                <Link href={step.href}>
                  <span className={step.complete ? 'step-complete' : 'step-number'}>
                    {step.complete ? <Check size={12} /> : index + 1}
                  </span>
                  {step.label}
                  {!step.complete && <ArrowUpRight size={12} />}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}
      <div className="overview-grid">
        <div className="overview-main-column">
          <section className="revenue-panel" aria-labelledby="revenue-title" data-animate>
            <div className="revenue-topline">
              <span id="revenue-title">
                <ArrowDownLeft size={16} />
                Cobros confirmados
              </span>
              <div className="period-selector" aria-label="Período de cobros">
                {[7, 14, 30].map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={period === value}
                    onClick={() => setPeriod(value)}
                  >
                    {value} días
                  </button>
                ))}
              </div>
            </div>
            <div className="revenue-value-row">
              <div>
                <p className="revenue-amount" aria-live="polite">
                  {money(confirmed?.amount)}
                </p>
                <span className="revenue-caption">
                  {summary.isLoading
                    ? 'Cargando cobros…'
                    : summary.isError
                      ? 'No pudimos obtener el resumen.'
                      : `${confirmed?.count ?? 0} cobros confirmados en los últimos ${period} días`}
                </span>
              </div>
              <span className="revenue-currency">
                PEN <span>↙</span>
              </span>
            </div>
            {summary.isError ? (
              <div className="overview-error" role="alert">
                <p>El resumen no está disponible. Tus datos no se han modificado.</p>
                <button
                  className="workspace-button"
                  type="button"
                  onClick={() => void summary.refetch()}
                >
                  <RefreshCw size={14} />
                  Reintentar
                </button>
              </div>
            ) : (
              <div
                className="revenue-chart"
                aria-label={`Cobros diarios de los últimos ${period} días`}
                aria-busy={summary.isLoading}
              >
                <div className="chart-grid" aria-hidden="true">
                  {[3, 2, 1, 0].map((tick) => (
                    <div key={tick}>
                      <span>
                        {maximum
                          ? Math.round((maximum * tick) / 3).toLocaleString('es-PE')
                          : tick === 0
                            ? '0'
                            : '—'}
                      </span>
                    </div>
                  ))}
                </div>
                {!maximum && !summary.isLoading && (
                  <div className="chart-empty">
                    <span>
                      <ArrowDownLeft size={18} />
                    </span>
                    <strong>El próximo movimiento empieza contigo.</strong>
                    <p>Los cobros confirmados dibujarán tu actividad aquí.</p>
                  </div>
                )}
                <div
                  className="chart-bars"
                  style={{ gridTemplateColumns: `repeat(${period}, minmax(0, 1fr))` }}
                >
                  {days.map((day) => (
                    <div key={day.date} className="chart-day">
                      <div className="chart-bar-track">
                        <button
                          type="button"
                          className={day.amount ? 'chart-bar' : 'chart-bar empty'}
                          style={{
                            height:
                              day.amount && maximum
                                ? `${Math.max((day.amount / maximum) * 100, 3)}%`
                                : '2px',
                          }}
                          aria-label={`${day.label}: ${formatCurrency(day.amount.toFixed(2), 'PEN')}`}
                        >
                          <span className="chart-tooltip">
                            {day.label}
                            <strong>{formatCurrency(day.amount.toFixed(2), 'PEN')}</strong>
                          </span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="chart-labels">
                  <span>{days[0]?.label}</span>
                  <span>{days[Math.floor(period / 2)]?.label}</span>
                  <span>Hoy</span>
                </div>
              </div>
            )}
            <div className="revenue-statline">
              <div>
                <span>Transacciones detectadas</span>
                <strong>
                  {loaded ? (summary.data?.totals.count ?? 0) : '—'}
                  <small> en el período</small>
                </strong>
              </div>
              <div>
                <span>Ticket promedio</span>
                <strong>{money(confirmed?.average)}</strong>
              </div>
              <Link href="/transacciones">
                <span>En disputa</span>
                <strong>
                  {loaded ? pendingReview : '—'}
                  <ArrowUpRight size={15} />
                </strong>
              </Link>
            </div>
          </section>
          <section className="ledger-panel" data-animate aria-labelledby="ledger-title">
            <header>
              <div>
                <span className="workspace-eyebrow">MOVIMIENTOS</span>
                <h2 id="ledger-title">El detalle hace la diferencia.</h2>
              </div>
              <Link href="/transacciones" className="workspace-text-link">
                Ver historial <ArrowRight size={15} />
              </Link>
            </header>
            {recent.isError ? (
              <div className="overview-error" role="alert">
                <p>No pudimos cargar el historial.</p>
                <button
                  className="workspace-button"
                  type="button"
                  onClick={() => void recent.refetch()}
                >
                  Reintentar
                </button>
              </div>
            ) : recent.isLoading ? (
              <div className="ledger-empty" role="status">
                Cargando movimientos…
              </div>
            ) : !rows.length ? (
              <div className="ledger-empty">
                <span className="ledger-empty-icon">
                  <Wallet size={22} />
                </span>
                <strong>Un lugar para cada cobro.</strong>
                <p>
                  Cuando tu Android detecte una notificación válida,
                  <br className="hidden sm:block" /> encontrarás aquí el remitente, importe y
                  estado.
                </p>
                <Link href="/transacciones">
                  Explorar transacciones <ArrowRight size={14} />
                </Link>
              </div>
            ) : (
              <div className="ledger-scroll">
                <table className="overview-ledger">
                  <thead>
                    <tr>
                      <th>Remitente / momento</th>
                      <th>Billetera</th>
                      <th>Importe</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((transaction) => (
                      <tr key={transaction.id}>
                        <td>
                          <Link href="/transacciones">
                            <span className="ledger-avatar">
                              {(transaction.sender_name ?? '?').slice(0, 1).toUpperCase()}
                            </span>
                            <span>
                              <strong>{transaction.sender_name ?? 'Sin nombre'}</strong>
                              <small>{formatElapsed(transaction.occurred_at)}</small>
                            </span>
                          </Link>
                        </td>
                        <td>
                          <span className="wallet-pill">{transaction.wallet.display_name}</span>
                        </td>
                        <td className="financial-value">
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </td>
                        <td>
                          <StatusBadge status={transaction.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <footer>
              <span>
                <Clock3 size={12} />
                Últimos 5 movimientos · todos los períodos
              </span>
              <span>Yallegó / Registro de cobros</span>
            </footer>
          </section>
        </div>
        <aside className="operation-monitor" aria-labelledby="monitor-title" data-animate>
          <header>
            <span className="workspace-eyebrow">MONITOR</span>
            <Radio size={16} />
          </header>
          <h2 id="monitor-title">
            Detrás de cada cobro,
            <br />
            una conexión.
          </h2>
          <div className={`monitor-status ${healthy && !devices.isError ? 'is-healthy' : ''}`}>
            <span />
            {monitorLabel}
          </div>
          <div className="monitor-illustration" aria-hidden="true">
            <span className="monitor-orbit orbit-one" />
            <span className="monitor-orbit orbit-two" />
            <span className="monitor-line" />
            <span className="monitor-phone">
              <Smartphone size={33} strokeWidth={1.2} />
              <span />
            </span>
            <span className="monitor-cloud">
              <Laptop size={23} strokeWidth={1.2} />
            </span>
            <span className="monitor-packet" />
          </div>
          <div className="monitor-count">
            <strong>
              {devices.isSuccess ? online.length : '—'}
              <span> / {devices.isSuccess ? deviceList.length : '—'}</span>
            </strong>
            <span>
              dispositivos
              <br />
              en línea
            </span>
          </div>
          <div className="monitor-devices">
            {devices.isError ? (
              <button
                className="workspace-button"
                type="button"
                onClick={() => void devices.refetch()}
              >
                Consultar de nuevo
              </button>
            ) : !deviceList.length ? (
              <p>
                {devices.isLoading
                  ? 'Buscando dispositivos…'
                  : 'Conecta un Android para empezar a detectar tus cobros.'}
              </p>
            ) : (
              deviceList.slice(0, 3).map((device) => (
                <div key={device.id}>
                  <Smartphone size={16} />
                  <span>
                    <strong>{device.label}</strong>
                    <small>
                      {device.status !== 'ACTIVE'
                        ? 'No habilitado'
                        : device.connectivity === 'ONLINE'
                          ? 'En línea'
                          : device.connectivity === 'DEGRADED'
                            ? 'Señal retrasada'
                            : 'Sin conexión'}
                    </small>
                  </span>
                  {device.status === 'ACTIVE' && device.connectivity === 'ONLINE' ? (
                    <Check size={14} className="text-success-600" />
                  ) : (
                    <Circle size={10} className="text-warning-600" />
                  )}
                </div>
              ))
            )}
          </div>
          {canManageDevices && (
            <Link href="/dispositivos" className="monitor-manage">
              Gestionar dispositivos <ArrowUpRight size={15} />
            </Link>
          )}
          <div className="monitor-note">
            <span>UNA COSA MENOS EN TU CABEZA</span>
            <p>
              Tu Android detecta.
              <br />
              Tu espacio organiza.
              <br />
              <strong>Tú sigues con tu negocio.</strong>
            </p>
          </div>
          <p className="monitor-footnote">
            El estado de conexión se consulta cada 30 segundos. No confirma la recepción de un pago.
          </p>
        </aside>
      </div>
      <footer className="overview-footer">
        <span>Menos ruido. Más claridad.</span>
        <span>
          Yallegó Workspace <span>✳</span>
        </span>
      </footer>
      {pairing && session && walletEnabled && (
        <PairDeviceDialog accessToken={session.accessToken} onClose={() => setPairing(false)} />
      )}
    </div>
  );
}
